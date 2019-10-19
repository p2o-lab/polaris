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
    ControlEnableInterface, OperationMode,
    ParameterOptions,
    ServiceCommand,
    ServiceInterface,
    ServiceOptions, SourceMode
} from '@p2olab/polaris-interface';
import {EventEmitter} from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import {Category} from 'typescript-logging';
import {catService} from '../../logging/logging';
import {DataAssembly} from '../dataAssembly/DataAssembly';
import {DataAssemblyFactory} from '../dataAssembly/DataAssemblyFactory';
import {ServiceControl} from '../dataAssembly/ServiceControl';
import {BaseService, BaseServiceEvents} from './BaseService';
import {controlEnableToJson, ServiceControlEnable, ServiceMtpCommand, ServiceState} from './enum';
import {Module} from './Module';
import {OpcUaConnection} from './OpcUaConnection';
import {Strategy} from './Strategy';

/**
 * Events emitted by [[Service]]
 */
interface ServiceEvents extends BaseServiceEvents {
    opMode: {
        operationMode: OperationMode,
        sourceMode: SourceMode
    };
}

type ServiceEmitter = StrictEventEmitter<EventEmitter, ServiceEvents>;

/**
 * Service of a [[Module]]
 *
 * after connection to a real PEA, commands can be triggered and states can be retrieved
 *
 */
export class Service extends BaseService {

    public get qualifiedName() {
        return `${this._parentId}.${this.name}`;
    }

    public get controlEnable(): ControlEnableInterface {
        return controlEnableToJson(this.serviceControl.communication.CommandEnable.value as ServiceControlEnable);
    }

    public get state(): ServiceState {
        return this.serviceControl.communication.State.value as ServiceState;
    }

    public get lastStatusChange(): Date {
        return this.serviceControl.communication.State.timestamp;
    }

    public get currentStrategy() {
        return this.serviceControl.communication.CurrentStrategy.value;
    }

    public readonly eventEmitter: ServiceEmitter;
    public readonly strategies: Strategy[] = [];
    public readonly parameters: DataAssembly[] = [];
    public readonly connection: OpcUaConnection;
    // use ControlExt (true) or ControlOp (false)
    public readonly automaticMode: boolean;
    public readonly serviceControl: ServiceControl;
    private readonly logger: Category;
    private serviceParametersEventEmitters: EventEmitter[];
    private _parentId: string;

    constructor(serviceOptions: ServiceOptions, connection: OpcUaConnection, parentId: string) {
        super();
        this._parentId = parentId;
        this._name = serviceOptions.name;
        if (!serviceOptions.name) {
            throw new Error('No service name provided');
        }

        this.automaticMode = true;
        this.connection = connection;
        this.serviceParametersEventEmitters = [];

        this._lastStatusChange = new Date();
        this.logger = catService;

        this.serviceControl = new ServiceControl(
            {name: this._name, interface_class: 'ServiceControl', communication: serviceOptions.communication},
            connection);

        this.strategies = serviceOptions.strategies
            .map((option) => new Strategy(option, connection));

        if (serviceOptions.parameters) {
            this.parameters = serviceOptions.parameters
                .map((options) => DataAssemblyFactory.create(options, connection));
        }
    }

    public getDefaultStrategy(): Strategy {
        return this.strategies.find((strategy) => strategy.defaultStrategy);
    }

    /**
     * Get current strategy from internal memory.
     */
    public getCurrentStrategy(): Strategy {
        return this.strategies.find((strat) => parseInt(strat.id, 10) === this.currentStrategy);
    }

    /**
     * Notify about changes in to serviceControl, strategies, configuration parameters and process values
     * via events and log messages
     */
    public async subscribeToService(): Promise<ServiceEmitter> {
        this.logger.info(`[${this.qualifiedName}] Subscribe to service`);
        this.serviceControl
            .on('CommandEnable', () => {
                this.logger.debug(`[${this.qualifiedName}] ControlEnable changed: ` +
                    `${JSON.stringify(this.controlEnable)}`);
                this.eventEmitter.emit('controlEnable', this.controlEnable);
            })
            .on('OpMode', () => {
                this.logger.debug(`[${this.qualifiedName}] Current OpMode changed: ` +
                    `${this.serviceControl.getOperationMode()}`);
                this.eventEmitter.emit('opMode',
                    {
                        operationMode: this.serviceControl.getOperationMode(),
                        sourceMode: this.serviceControl.getSourceMode()
                    });
            })
            .on('State', () => {
                this.logger.debug(`[${this.qualifiedName}] State changed: ` +
                    `${ServiceState[this.state]}`);
                this.eventEmitter.emit('state', this.state);
                if (this.state === ServiceState.COMPLETED ||
                    this.state === ServiceState.ABORTED ||
                    this.state === ServiceState.STOPPED) {
                    this.clearListeners();
                }
            });
        const tasks = [];
        tasks.push(this.serviceControl.subscribe(50));

        tasks.concat(
            this.parameters.map((param) => {
                return param.subscribe();
            }),
            this.strategies.map((strategy) => {
                strategy.on('parameterChanged', (data) => {
                    this.eventEmitter.emit('parameterChanged', {
                        strategy,
                        parameter: data.parameter,
                        parameterType: data.parameterType
                    });
                });
                return strategy.subscribe();
            }));
        await Promise.all(tasks);
        return this.eventEmitter;
    }

    public unsubscribe() {
        this.serviceControl.unsubscribe();
        this.parameters.forEach((param) => param.unsubscribe());
        this.strategies.forEach((strategy) => strategy.unsubscribe());
    }

    /**
     * get JSON overview about service and its state, opMode, strategies, parameters and controlEnable
     */
    public getOverview(): ServiceInterface {
        const currentStrategy = this.getCurrentStrategy();
        return {
            name: this.name,
            operationMode: this.serviceControl.getOperationMode(),
            sourceMode: this.serviceControl.getSourceMode(),
            status: ServiceState[this.state],
            strategies: this.strategies.map((strategy) => strategy.toJson()),
            currentStrategy: currentStrategy ? currentStrategy.name : null,
            parameters: this.parameters.map((param) => param.toJson()),
            controlEnable: this.controlEnable,
            lastChange: this.lastStatusChange ?
                (new Date().getTime() - this.lastStatusChange.getTime()) / 1000 :
                undefined
        };
    }

    /**
     * Set strategy and strategy parameters and execute a command for service on PEA
     * @param {ServiceCommand} command  command to be executed on PEA
     * @param {Strategy}    strategy  strategy to be set on PEA
     * @param {ParameterOptions[]} parameters     parameters to be set on PEA
     * @returns {Promise<void>}
     */
    public async executeCommandWithStrategyAndParameter(command: ServiceCommand,
                                                        strategy: Strategy,
                                                        parameters: ParameterOptions[]): Promise<void> {
        if (!this.connection.isConnected()) {
            throw new Error('Module is not connected');
        }
        this.logger.info(`[${this.qualifiedName}] Execute ${command} (${strategy ? strategy.name : ''})`);
        if (strategy) {
            await this.setStrategy(strategy);
        }
        if (parameters) {
            await this.setParameters(parameters);
        }
        await this.executeCommand(command);
    }

    // overridden method from Base Service
    public async executeCommand(command: ServiceCommand) {
        if (!this.connection.isConnected()) {
            throw new Error('Module is not connected');
        }
        await super.executeCommand(command);
        const currentStrategy = this.getCurrentStrategy();
        this.eventEmitter.emit('commandExecuted', {
            strategy: currentStrategy,
            command: command,
            parameter: currentStrategy.parameters.map((param) => param.toJson())
        });
        this.logger.info(`[${this.qualifiedName}] ${command} executed`);
        }

    public start() {
        return this.sendCommand(ServiceMtpCommand.START);
    }

    public restart() {
        return this.sendCommand(ServiceMtpCommand.RESTART);
    }

    public stop() {
        return this.sendCommand(ServiceMtpCommand.STOP);
    }

    public reset() {
        return this.sendCommand(ServiceMtpCommand.RESET);
    }

    public complete() {
        return this.sendCommand(ServiceMtpCommand.COMPLETE);
    }

    public abort() {
        return this.sendCommand(ServiceMtpCommand.ABORT);
    }

    public unhold() {
        return this.sendCommand(ServiceMtpCommand.UNHOLD);
    }

    public pause() {
        return this.sendCommand(ServiceMtpCommand.PAUSE);
    }

    public resume() {
        return this.sendCommand(ServiceMtpCommand.RESUME);
    }

    /** Set strategy
     * Use default strategy if strategy is omitted
     * @returns {Promise<void>}
     */

    public async setStrategy(strategy: Strategy): Promise<void> {
        this.logger.debug(`[${this.qualifiedName}] set strategy: ${strategy.name}`);

        // first set opMode and then set strategy
        await this.setOperationMode();
        const node = this.automaticMode ?
            this.serviceControl.communication.StrategyExt : this.serviceControl.communication.StrategyMan;
        await node.write(strategy.id);
    }

    public getStrategyByNameOrDefault(strategyName: string) {
        let strategy: Strategy;
        if (!strategyName) {
            strategy = this.getDefaultStrategy();
        } else {
            strategy = this.strategies.find((strati) => strati.name === strategyName);
        }
        return strategy;
    }

    public async setParameters(parameterOptions: ParameterOptions[], modules: Module[] = []) {
        parameterOptions.map((p) => {
            const dataAssembly = this.findInputParameter(p.name);
            dataAssembly.setValue(p, modules);
        });
    }

    public async setOperationMode() {
        if (this.automaticMode) {
            await this.serviceControl.setToAutomaticOperationMode();
            await this.serviceControl.setToExternalSourceMode();
        } else {
            await this.serviceControl.setToManualOperationMode();
        }
    }

    public findInputParameter(parameterName: string): DataAssembly {
        const parameterList = [].concat(
            this.parameters,
            this.getCurrentStrategy().parameters,
            this.getCurrentStrategy().processValuesIn
        );
        return parameterList.find((obj) => (obj.name === parameterName));
    }

    /**
     *
     */
    private clearListeners() {
        this.logger.info(`[${this.qualifiedName}] clear parameter listener`);
        this.serviceParametersEventEmitters.forEach((listener) => listener.removeAllListeners());
    }

    private async sendCommand(command: ServiceMtpCommand) {
        this.logger.debug(`[${this.qualifiedName}] Send command ${ServiceMtpCommand[command]}`);
        await this.setOperationMode();

        const node = this.automaticMode ?
            this.serviceControl.communication.CommandExt :
            this.serviceControl.communication.CommandMan;
        await node.write(command);
        this.logger.trace(`[${this.qualifiedName}] Command ${ServiceMtpCommand[command]} written`);
    }

}
