/*
 * MIT License
 *
 * Copyright (c) 2021 P2O-Lab <p2o-lab@mailbox.tu-dresden.de>,
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
	ControlEnableInterface, OperationMode, ParameterInterface,
	ParameterOptions,
	ServiceCommand,
	ServiceInterface,
	ServiceOptions, ServiceSourceMode
} from '@p2olab/polaris-interface';
import {OpcUaConnection} from '../../connection';
import {
	controlEnableToJson, DataAssemblyFactory,
	InputElement, ServiceControl,
	ServiceControlEnable, ServiceMtpCommand,
	ServiceState, ServParam
} from '../../dataAssembly';

import {EventEmitter} from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import {Category} from 'typescript-logging';
import {PEA} from '../../PEA';
import {BaseService, BaseServiceEvents, catService} from './BaseService';
import {Procedure} from './procedure/Procedure';

export const catPEAService = new Category('service', catService);

/**
 * Events emitted by [[Service]]
 */
interface ServiceEvents extends BaseServiceEvents {
	opMode: {
		operationMode: OperationMode;
		sourceMode: ServiceSourceMode;
	};
}

type ServiceEmitter = StrictEventEmitter<EventEmitter, ServiceEvents>;

/**
 * Service of a [[PEA]]
 *
 * after connection to a real PEA, commands can be triggered and states can be retrieved
 *
 */
export class Service extends BaseService {

	public readonly eventEmitter!: ServiceEmitter;
	public readonly procedures: Procedure[] = [];
	public readonly parameters: ServParam[] = [];
	public readonly connection: OpcUaConnection;
	public readonly serviceControl: ServiceControl;
	private readonly logger: Category;
	private serviceParametersEventEmitters: EventEmitter[];
	private readonly _parentId: string;

	constructor(serviceOptions: ServiceOptions, connection: OpcUaConnection, parentId: string) {
		super();
		this._parentId = parentId;
		this._name = serviceOptions.name;
		if (!serviceOptions.name) {
			throw new Error('No service name provided');
		}
		this.connection = connection;
		this.serviceParametersEventEmitters = [];

		this._lastStatusChange = new Date();
		this.logger = catService;

		this.serviceControl = new ServiceControl(
			{name: this._name, interfaceClass: 'ServiceControl', communication: serviceOptions.communication},
			connection);

		this.procedures = serviceOptions.procedures
			.map((option) => new Procedure(option, connection));

		// TODO: Check what happens if DataAssembly already exists --> Is that a matter?
		if (serviceOptions.parameters) {
			this.parameters = serviceOptions.parameters
				.map((options) => DataAssemblyFactory.create(options, connection) as ServParam);
		}
	}

	public get qualifiedName(): string {
		return `${this._parentId}.${this.name}`;
	}

	public get controlEnable(): ControlEnableInterface {
		return controlEnableToJson(this.serviceControl.communication.CommandEn.value as ServiceControlEnable);
	}

	public get state(): ServiceState {
		return this.serviceControl.communication.StateCur.value as ServiceState;
	}

	public get lastStatusChange(): Date {
		return this.serviceControl.communication.StateCur.timestamp;
	}

	public get currentProcedure(): number | undefined {
		return this.serviceControl.communication.ProcedureCur.value;
	}

	public getDefaultProcedure(): Procedure | undefined {
		return this.procedures.find((procedure) => procedure.defaultProcedure);
	}

	/**
	 * Get current procedure from internal memory.
	 */
	public getCurrentProcedure(): Procedure {
		const curProc = this.procedures.find((proc) => parseInt(proc.id, 10) === this.currentProcedure);
		if (!curProc) {
			throw new Error('Current Procedure not found.');
		}
		return curProc;
	}

	/**
	 * Notify about changes in to serviceControl, procedures, configuration parameters and process values
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
						sourceMode: this.serviceControl.getServiceSourceMode()
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
			})
			/*, TODO: Check this section
			this.procedures.map((procedure) => {
				procedure.on('parameterChanged', (data) => {
					this.eventEmitter.emit('parameterChanged', {
						procedure,
						parameter: data.parameter,
						parameterType: data.parameterType
						});
					});
				return procedure.subscribe();
				}
			)*/
		);
		await Promise.all(tasks);
		return this.eventEmitter;
	}

	public unsubscribe(): void {
		this.serviceControl.unsubscribe();
		this.parameters.forEach((param) => param.unsubscribe());
		this.procedures.forEach((procedure) => procedure.unsubscribe());
	}

	/**
	 * get JSON overview about service and its state, opMode, procedures, parameters and controlEnable
	 */
	public json(): ServiceInterface {
		return {
			name: this.name,
			operationMode: this.serviceControl.getOperationMode(),
			serviceSourceMode: this.serviceControl.getServiceSourceMode(),
			status: ServiceState[this.state],
			procedures: this.procedures.map((procedure) => procedure.toJson()),
			currentProcedure: this.getCurrentProcedure().name,
			parameters: this.parameters.map((param) => param.toJson()),
			controlEnable: this.controlEnable,
			lastChange: (new Date().getTime() - this.lastStatusChange.getTime()) / 1000,
		};
	}

	// overridden method from Base Service
	public async executeCommand(command: ServiceCommand): Promise<void> {
		if (!this.connection.isConnected()) {
			throw new Error('PEA is not connected');
		}
		await super.executeCommand(command);
		const currentProcedure = this.getCurrentProcedure();
		this.eventEmitter.emit('commandExecuted', {
			procedure: currentProcedure,
			command: command,
			parameter: currentProcedure?.parameters.map((param) => param.toJson() as ParameterInterface)
		});
		this.logger.info(`[${this.qualifiedName}] ${command} executed`);
	}

	public start(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.START);
	}

	public restart(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.RESTART);
	}

	public stop(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.STOP);
	}

	public reset(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.RESET);
	}

	public complete(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.COMPLETE);
	}

	public abort(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.ABORT);
	}

	public hold(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.HOLD);
	}

	public unhold(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.UNHOLD);
	}

	public pause(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.PAUSE);
	}

	public resume(): Promise<void> {
		return this.sendCommand(ServiceMtpCommand.RESUME);
	}

	/** Set procedure
	 * Use default procedure if procedure is omitted
	 * @returns {Promise<void>}
	 */

	public async setProcedure(procedure: Procedure): Promise<void> {
		this.logger.debug(`[${this.qualifiedName}] set procedure: ${procedure.name}`);

		// first set opMode and then set procedure
		await this.setOperationMode();
		await this.serviceControl.communication.ProcedureExt.write(procedure.id);
	}

	public getProcedureByNameOrDefault(procedureName: string): Procedure | undefined {
		let procedure: Procedure | undefined;
		if (!procedureName) {
			procedure = this.getDefaultProcedure();
		} else {
			procedure = this.procedures.find((proc) => proc.name === procedureName);
		}
		return procedure;
	}

	public async setParameters(parameterOptions: ParameterOptions[], peaSet: PEA[] = []): Promise<void> {
		parameterOptions.map((p) => {
			const dataAssembly = this.findInputParameter(p.name);
			dataAssembly?.setValue(p, peaSet);
		});
	}

	public async setOperationMode(): Promise<void> {
		await this.serviceControl.setToAutomaticOperationMode();
		await this.serviceControl.setToExternalServiceSourceMode();
	}

	public findInputParameter(parameterName: string): InputElement | ServParam | undefined {
		let result: InputElement | ServParam | undefined;
		result = this.parameters.find((obj) => (obj.name === parameterName));
		if (!result) {
			result = this.getCurrentProcedure()?.parameters.find((obj) => (obj.name === parameterName));
		}
		if (!result) {
			result = this.getCurrentProcedure()?.processValuesIn.find((obj) => (obj.name === parameterName));
		}
		return result;
	}

	/**
	 *
	 */
	private clearListeners(): void {
		this.logger.info(`[${this.qualifiedName}] clear parameter listener`);
		this.serviceParametersEventEmitters.forEach((listener) => listener.removeAllListeners());
	}

	private async sendCommand(command: ServiceMtpCommand): Promise<void> {
		this.logger.debug(`[${this.qualifiedName}] Send command ${ServiceMtpCommand[command]}`);
		await this.setOperationMode();

		await this.serviceControl.communication.CommandExt.write(command);
		this.logger.trace(`[${this.qualifiedName}] Command ${ServiceMtpCommand[command]} written`);
	}

}