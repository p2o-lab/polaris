/*
 * MIT License
 *
 * Copyright (c) 2018 Markus Graube <markus.graube@tu.dresden.de>,
 * Chair for Process Control Systems, Technische Universität Dresden
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Service, ServiceOptions } from './Service';
import { ProcessValue } from './ProcessValue';
import {
    AttributeIds,
    ClientMonitoredItem,
    ClientSession,
    ClientSubscription,
    coerceNodeId,
    DataValue,
    NodeId,
    OPCUAClient,
    Variant
} from 'node-opcua-client';
import { catModule, catOpc, catRecipe } from '../config/logging';
import { EventEmitter } from 'events';
import { OpcUaNode } from './Interfaces';
import { manager } from './Manager';
import { ServiceState } from './enum';
import { ModuleInterface, ServiceInterface } from 'pfe-ree-interface';
import { promiseTimeout } from '../timeout-promise';
import { serviceArchive, variableArchive } from '../logging/archive';

export interface ModuleOptions {
    id: string;
    opcua_server_url: string;
    hmi_url?: string;
    services: ServiceOptions[];
    process_values: object[];
}

/**
 * Module (PEA)
 *
 * @event connected         when module successfully connects to PEA
 * @event disconnected      when module is disconnected from PEA
 * @event errorMessage      when errorMessage of son eservice changes
 * @event stateChanged
 * @event serviceCompleted
 */
export class Module extends EventEmitter {
    readonly id: string;
    readonly endpoint: string;
    services: Service[];
    variables: ProcessValue[];
    readonly hmiUrl: string;

    session: ClientSession;
    private client: OPCUAClient;
    subscription: ClientSubscription;
    private monitoredItems: Map<NodeId, { monitoredItem: ClientMonitoredItem, emitter: EventEmitter }>;
    private namespaceArray: string[];

    // module is protected and can't be deleted by the user
    protected: boolean = false;

    constructor(options: ModuleOptions, protectedModule: boolean = false) {
        super();
        this.id = options.id;
        this.endpoint = options.opcua_server_url;
        this.protected = protectedModule;

        if (options.services) {
            this.services = options.services.map(serviceOption => new Service(serviceOption, this));
        }
        if (options.process_values) {
            this.variables = options.process_values.map(variableOptions => new ProcessValue(variableOptions));
        }
        if (options.hmi_url){
            this.hmiUrl = options.hmi_url;
        }

        this.monitoredItems = new Map<NodeId, { monitoredItem: ClientMonitoredItem, emitter: EventEmitter }>();
    }

    /**
     * Opens connection to server and establish session
     * @fires connected
     * @returns {Promise<void>}
     */
    async connect(): Promise<void> {
        if (this.session) {
            catOpc.debug(`Already connected to module ${this.id}`);
        } else {
            try {
                catOpc.info(`connect module ${this.id} ${this.endpoint}`);
                const client = new OPCUAClient({
                    endpoint_must_exist: false,
                    connectionStrategy: {
                        maxRetry: 10
                    }
                });

                client.on('backoff', () => catOpc.debug('retrying connection'));

                await promiseTimeout(5000, client.connect(this.endpoint));
                catOpc.debug(`module connected ${this.id} ${this.endpoint}`);

                const session = await client.createSession();
                catOpc.debug(`session established ${this.id} ${this.endpoint}`);

                const subscription = new ClientSubscription(session, {
                    requestedPublishingInterval: 100,
                    requestedLifetimeCount: 10,
                    requestedMaxKeepAliveCount: 2,
                    maxNotificationsPerPublish: 10,
                    publishingEnabled: true,
                    priority: 10
                });

                subscription
                    .on('started', () => {
                        catOpc.trace(`subscription started - subscriptionId=${subscription.subscriptionId}`);
                    })
                    // .on("keepalive", () => catOpc.trace("keepalive"))
                    .on('terminated', () => {
                        catOpc.trace(`subscription (Id=${subscription.subscriptionId}) terminated`);
                    });

                // read namespace array
                const result: DataValue = await session.readVariableValue('ns=0;i=2255');
                this.namespaceArray = result.value.value;
                catModule.debug(`Got namespace array for ${this.id}: ${JSON.stringify(this.namespaceArray)}`);

                // store everything
                this.client = client;
                this.session = session;
                this.subscription = subscription;

                // subscribe to all services
                try {
                    this.subscribeToAllServices();
                } catch (err) {
                    catModule.warn('Could not connect to all services:' + err);
                }
                try {
                    this.subscribeToAllVariables();
                } catch (err) {
                    catModule.warn('Could not connect to all variables:' + err);
                }
                this.emit('connected');
                this.emit('refresh', 'module', module);
            } catch (err) {
                return Promise.reject(`Could not connect to module ${this.id} on ${this.endpoint}: ${err.toString()}`);
            }
        }
    }

    async getServiceStates(): Promise<ServiceInterface[]> {
        catRecipe.trace('check services');
        const tasks = this.services.map(service => service.getOverview());
        return Promise.all(tasks);
    }

    /**
     * Close session and disconnect from server
     *
     */
    disconnect(): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (this.session) {
                catModule.info(`Disconnect module ${this.id}`);
                try {
                    await promiseTimeout(1000, this.session.close());
                    this.session = undefined;
                    await promiseTimeout(1000, this.client.disconnect());
                    this.client = undefined;
                    catModule.debug(`Module ${this.id} disconnected`);
                    this.emit('disconnected');
                    this.emit('refresh', 'module');
                    resolve(`Module ${this.id} disconnected`);
                } catch (err) {
                    reject(err);
                }
            } else {
                resolve(`Module ${this.id} already disconnected`);
            }
        });
    }

    /**
     * Listen to OPC UA node and return event listener which is triggered by any value change
     * @param {OpcUaNode} node
     * @returns {"events".internal.EventEmitter} "changed" event
     */
    listenToOpcUaNode(node: OpcUaNode): EventEmitter {
        const nodeId = this.resolveNodeId(node);
        if (!this.monitoredItems.has(nodeId)) {
            const monitoredItem: ClientMonitoredItem = this.subscription.monitor({
                nodeId,
                attributeId: AttributeIds.Value
            },
                {
                    samplingInterval: 100,
                    discardOldest: true,
                    queueSize: 10
                });

            const emitter = new EventEmitter();
            monitoredItem.on('changed', (dataValue) => {
                catOpc.debug(`Variable Changed (${this.resolveNodeId(node)}) = ${dataValue.value.value.toString()}`);
                emitter.emit('changed', dataValue.value.value);
            });
            this.monitoredItems.set(nodeId, { monitoredItem, emitter });
        }
        return this.monitoredItems.get(nodeId).emitter;
    }

    listenToVariable(dataStructureName: string, variableName: string): EventEmitter {
        const dataStructure: ProcessValue = this.variables.find(variable => variable.name === dataStructureName);
        if (!dataStructure) {
            throw new Error(`ProcessValue ${dataStructureName} is not specified for module ${this.id}`);
        } else {
            const variable: OpcUaNode = dataStructure.communication[variableName];
            return this.listenToOpcUaNode(variable);
        }

    }

    clearListener(node: OpcUaNode) {
        const nodeId = this.resolveNodeId(node);
        if (this.monitoredItems.has(nodeId)) {
            const { monitoredItem, emitter } = this.monitoredItems.get(nodeId);

            if (monitoredItem) {
                monitoredItem.terminate(() => catOpc.trace(`Listener ${JSON.stringify(nodeId)} terminated`));
            }
            if (emitter) {
                emitter.removeAllListeners();
            }
            this.monitoredItems.delete(nodeId);
        }
    }

    public readVariable(dataStructureName: string, variableName: string) {
        const dataStructure = this.variables.find(variable => variable.name === dataStructureName);
        if (!dataStructure) {
            throw new Error(`Datastructure ${dataStructureName}.${variableName} not found in module ${this.id}`);
        } else {
            const variable = dataStructure.communication[variableName];
            return this.readVariableNode(variable);
        }
    }

    private subscribeToAllVariables() {
        this.variables.forEach((variable: ProcessValue) => {
            if (variable.communication['V'] && variable.communication['V'].node_id != null) {
                this.listenToOpcUaNode(variable.communication['V'])
                    .on('changed', (data) => {
                        catModule.debug(`variable changed: ${this.id}.${variable.name} = ${data}`);
                        variableArchive.push({
                            datetime: new Date(),
                            module: this.id,
                            variable: variable.name,
                            value: data
                        });
                    });
            } else {
                catModule.debug(`OPC UA variable for variable ${variable.name} not defined`);
            }
        });
    }

    private subscribeToAllServices() {
        this.services.forEach((service) => {
            service.subscribeToService()
                .on('errorMessage', (errorMessage) => {
                    this.emit('errorMessage', service, errorMessage);
                })
                .on('state', (state) => {
                    catModule.info(`state changed: ${this.id}.${service.name} = ${ServiceState[state]}`);
                    serviceArchive.push({
                        datetime: new Date(),
                        module: this.id,
                        service: service.name,
                        state: ServiceState[state]
                    });
                    this.emit('stateChanged', service, state);
                    if (state === ServiceState.COMPLETED) {
                        this.emit('serviceCompleted', service);
                    }
                });
        });
    }

    public readVariableNode(node: OpcUaNode) {
        const nodeId = this.resolveNodeId(node);
        const result = this.session.readVariableValue(nodeId);
        catOpc.debug(`Read Variable: ${JSON.stringify(node)} -> ${nodeId} = ${result}`);
        return result;
    }

    /** writes value to opc ua node
     *
     * @param {OpcUaNode} node
     * @param {} value
     * @returns {Promise<any>}
     */
    public async writeNode(node: OpcUaNode, value: Variant) {
        if (!this.session) {
            throw new Error(`Can not write node since OPC UA connection to module ${this.id} is not established`);
        } else {
            const result = await this.session.writeSingleNode(this.resolveNodeId(node), value);
            catModule.debug(`Write result for ${this.id}.${node.node_id}=${value.value} -> ${result.name}`);
            return result;
        }
    }

    /**
     * Get JSON serialisation of module
     *
     * @returns {Promise<ModuleInterface>}
     */
    async json(): Promise<ModuleInterface> {
        return {
            id: this.id,
            endpoint: this.endpoint,
            hmiUrl: this.hmiUrl,
            connected: this.isConnected(),
            services: this.isConnected() ? await this.getServiceStates() : undefined,
            protected: this.protected
        };
    }

    isConnected(): boolean {
        return !!this.session;
    }

    /**
     * Resolves nodeId of variable from module JSON using the namespace array
     * @param {OpcUaNode} variable
     * @returns {any}
     */
    private resolveNodeId(variable: OpcUaNode) {
        if (!variable) {
            throw new Error('No variable specified to resolve nodeid');
        } else if (!this.namespaceArray) {
            throw new Error(`No namespace array read for module ${this.id}`);
        } else {
            const nodeIdString = `ns=${this.namespaceArray.indexOf(variable.namespace_index)};s=${variable.node_id}`;
            catOpc.debug(`resolveNodeId ${JSON.stringify(variable)} -> ${nodeIdString}`);
            return coerceNodeId(nodeIdString);
        }
    }

    /**
     * Abort all services in module
     */
    abort() {
        const tasks = this.services.map(service => service.abort());
        return Promise.all(tasks);
    }

    /**
     * Pause all services in module
     */
    pause() {
        const tasks = this.services.map(service => service.pause());
        return Promise.all(tasks);
    }

    /**
     * Resume all services in module
     */
    resume() {
        const tasks = this.services.map(service => service.resume());
        return Promise.all(tasks);
    }

    /**
     * Stop all services in module
     */
    stop() {
        const tasks = this.services.map(service => service.stop());
        return Promise.all(tasks);
    }

}
