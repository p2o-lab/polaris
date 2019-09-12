/*
 * MIT License
 *
 * Copyright (c) 2019 Markus Graube <markus.graube@tu.dresden.de>,
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

import {
    ControlEnableInterface,
    ModuleInterface,
    ModuleOptions,
    OpModeInterface,
    ParameterInterface,
    ServiceCommand,
    ServiceInterface
} from '@p2olab/polaris-interface';
import {EventEmitter} from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import {Category} from 'typescript-logging';
import {catModule} from '../../config/logging';
import {VariableLogEntry} from '../../logging/archive';
import {DataAssembly} from '../dataAssembly/DataAssembly';
import {DataAssemblyFactory} from '../dataAssembly/DataAssemblyFactory';
import {DataItemEmitter} from '../dataAssembly/DataItem';
import {ServiceState} from './enum';
import {OpcUaConnection} from './OpcUaConnection';
import {Service} from './Service';
import {Strategy} from './Strategy';

/**
 * Events emitted by [[Module]]
 */
interface ModuleEvents {
    /**
     * when module successfully connects to PEA
     * @event connected
     */
    connected: void;
    /**
     * when module is disconnected from PEA
     * @event disconnected
     */
    disconnected: void;
    /**
     * when controlEnable of one service changes
     * @event controlEnable
     */
    controlEnable: { service: Service, controlEnable: ControlEnableInterface };
    /**
     * Notify when a service changes its state
     * @event stateChanged
     */
    stateChanged: {
        timestampPfe: Date,
        timestampModule: Date,
        service: Service,
        state: ServiceState
    };
    /**
     * Notify when a service changes its opMode
     * @event opModeChanged
     */
    opModeChanged: {
        service: Service,
        opMode: OpModeInterface
    };
    /**
     * Notify when a variable inside a module changes
     * @event variableChanged
     */
    variableChanged: VariableLogEntry;

    /**
     * Notify when
     * @event parameterChanged
     */
    parameterChanged: {
        timestampPfe: Date,
        timestampModule: Date,
        service: string,
        strategy: string;
        parameter: string;
        value: any;
        unit: string;
    };

    /**
     * whenever a command is executed from the POL
     * @event commandExecuted
     */
    commandExecuted: {
        service: Service,
        timestampPfe: Date,
        strategy: Strategy,
        command: ServiceCommand,
        parameter: ParameterInterface[]
    };

    /**
     * when one service goes to *completed*
     * @event serviceCompleted
     */
    serviceCompleted: Service;
}

type ModuleEmitter = StrictEventEmitter<EventEmitter, ModuleEvents>;

/**
 * Module (PEA) with its services and variables
 *
 * in order to interact with a module, you must first [[connect]] to it
 *
 */
export class Module extends (EventEmitter as new() => ModuleEmitter) {

    public readonly options: ModuleOptions;
    public readonly id: string;
    public readonly hmiUrl: string;
    public readonly services: Service[];
    public readonly variables: DataAssembly[];
    public readonly logger: Category;

    // module is protected and can't be deleted by the user
    public protected: boolean = false;

    public readonly connection: OpcUaConnection;

    constructor(options: ModuleOptions, protectedModule: boolean = false) {
        super();
        this.options = options;
        this.id = options.id;
        this.protected = protectedModule;
        this.hmiUrl = options.hmi_url;
        this.connection = new OpcUaConnection(this.id, options.opcua_server_url, options.username, options.password)
            .on('connected', () => this.emit('connected'))
            .on('disconnected', () => this.emit('disconnected'));
        this.logger = catModule;

        if (options.services) {
            this.services = options.services.map((serviceOpts) => new Service(serviceOpts, this.connection, this.id));
        }
        if (options.process_values) {
            this.variables = options.process_values
                .map((variableOptions) => DataAssemblyFactory.create(variableOptions, this.connection));
        }
    }

    public getServiceStates(): ServiceInterface[] {
        this.logger.trace(`[${this.id}] check service states`);
        return this.services.map((service) => service.getOverview());
    }

    public async connect() {
        await this.connection.connect();
        await this.subscribeToAllVariables();
        await this.subscribeToAllServices();
        this.logger.info(`[${this.id}] Successfully subscribed to ${this.connection.monitoredItemSize()} assemblies`);
    }

    /**
     * Close session and disconnect from server of module
     *
     */
    public async disconnect(): Promise<void> {
        this.logger.info(`[${this.id}] Disconnect module`);
        await this.unsubscribeFromAllVariables();
        await this.unsubscribeFromAllServices();
        this.services.forEach((s) => s.unsubscribe());
        await this.connection.disconnect();
        this.emit('disconnected');
        this.logger.info(`[${this.id}] Module disconnected`);
    }

    /**
     * Get JSON serialisation of module
     */
    public json(): ModuleInterface {
        return {
            id: this.id,
            endpoint: this.connection.endpoint,
            hmiUrl: this.hmiUrl,
            connected: this.isConnected(),
            services: this.getServiceStates(),
            process_values: [],
            protected: this.protected
        };
    }

    /**
     * is module connected to physical PEA
     * @returns {boolean}
     */
    public isConnected(): boolean {
        return this.connection.isConnected();
    }

    public listenToDataAssembly(dataAssemblyName: string, variableName: string): DataItemEmitter {
        const dataAssembly: DataAssembly = this.variables.find((variable) => variable.name === dataAssemblyName);
        if (!dataAssembly) {
            throw new Error(`ProcessValue ${dataAssemblyName} is not specified for module ${this.id}`);
        }
        const emitter: EventEmitter = new EventEmitter();
        dataAssembly.on(variableName, (data) => emitter.emit('changed', data));
        return emitter;
    }

    /**
     * Abort all services in module
     */
    public abort(): Promise<void[]> {
        this.logger.info(`[${this.id}] Abort all services`);
        const tasks = this.services.map((service) => service.execute(ServiceCommand.abort));
        return Promise.all(tasks);
    }

    /**
     * Pause all services in module which are currently paused
     */
    public pause(): Promise<void[]> {
        this.logger.info(`[${this.id}] Pause all running services`);
        const tasks = this.services.map(async (service) => {
            if (service.state === ServiceState.EXECUTE) {
                return service.execute(ServiceCommand.pause);
            }
        });
        return Promise.all(tasks);
    }

    /**
     * Resume all services in module which are currently paused
     */
    public resume(): Promise<void[]> {
        this.logger.info(`[${this.id}] Resume all paused services`);
        const tasks = this.services.map(async (service) => {
            if (service.state === ServiceState.PAUSED) {
                return service.execute(ServiceCommand.resume);
            }
        });
        return Promise.all(tasks);
    }

    /**
     * Stop all services in module
     */
    public stop(): Promise<void[]> {
        this.logger.info(`[${this.id}] Stop all non-idle services`);
        const tasks = this.services.map((service) => {
            if (service.state !== ServiceState.IDLE) {
                return service.execute(ServiceCommand.stop);
            }
        });
        return Promise.all(tasks);
    }

    /**
     * Reset all services in module
     */
    public reset(): Promise<void[]> {
        this.logger.info(`[${this.id}] Reset all services`);
        const tasks = this.services.map((service) => service.execute(ServiceCommand.reset));
        return Promise.all(tasks);
    }

    private subscribeToAllVariables(): Promise<DataAssembly[]> {
        return Promise.all(
            this.variables.map((variable: DataAssembly) => {
                catModule.debug(`[${this.id}] subscribe to process variable ${variable.name}`);
                variable.on('V', (data) => {
                    this.logger.debug(`[${this.id}] variable changed: ${variable.name} = ` +
                        `${data.value} ${variable.getUnit()}`);
                    const entry: VariableLogEntry = {
                        timestampPfe: new Date(),
                        timestampModule: data.timestamp,
                        module: this.id,
                        variable: variable.name,
                        value: data.value,
                        unit: variable.getUnit()
                    };
                    this.emit('variableChanged', entry);
                });
                return variable.subscribe(1000);
            })
        );
    }

    private unsubscribeFromAllVariables() {
        this.variables.forEach((variable: DataAssembly) => variable.unsubscribe());
    }

    private subscribeToAllServices() {
        return Promise.all(this.services.map((service) => {
            service.eventEmitter
                .on('commandExecuted', (data) => {
                    this.emit('commandExecuted', {
                        service,
                        timestampPfe: data.timestamp,
                        strategy: data.strategy,
                        command: data.command,
                        parameter: data.parameter
                    });
                })
                .on('controlEnable', (controlEnable: ControlEnableInterface) => {
                    this.emit('controlEnable', {service, controlEnable});
                })
                .on('state', (state) => {
                    this.logger.debug(`[${this.id}] state changed: ${service.name} = ${ServiceState[state]}`);
                    const entry = {
                        timestampPfe: new Date(),
                        timestampModule: service.lastStatusChange,
                        service: service,
                        state: state
                    };
                    this.emit('stateChanged', entry);
                    if (state === ServiceState.COMPLETED) {
                        this.emit('serviceCompleted', service);
                    }
                })
                .on('opMode', (opMode: OpModeInterface) => {
                    this.logger.debug(`[${this.id}] opMode changed: ${service.name} = ${JSON.stringify(opMode)}`);
                    const entry = {
                        service,
                        opMode
                    };
                    this.emit('opModeChanged', entry);
                })
                .on('variableChanged', (data) => {
                    this.logger.debug(`[${this.id}] service variable changed: ` +
                        `${data.strategy.name}.${data.parameter} = ${data.value}`);
                    const entry = {
                        timestampPfe: new Date(),
                        timestampModule: new Date(),
                        module: this.id,
                        variable: `${service.name}.${data.strategy.name}.${data.parameter}`,
                        value: data.value,
                        unit: data.unit
                    };
                    this.emit('variableChanged', entry);
                }).on('parameterChanged', (data) => {
                    this.logger.debug(`[${this.id}] parameter changed: ` +
                        `${data.strategy.name}.${data.parameter} = ${data.value}`);
                    const entry = {
                        timestampPfe: new Date(),
                        timestampModule: new Date(),
                        module: this.id,
                        service: service.name,
                        strategy: data.strategy.id,
                        parameter: data.parameter,
                        value: data.value,
                        unit: data.unit
                    };
                    this.emit('parameterChanged', entry);
                });
            return service.subscribeToService();
        }));
    }

    private unsubscribeFromAllServices() {
        this.services.forEach((service) => service.unsubscribe());
    }

}
