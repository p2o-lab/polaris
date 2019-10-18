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

import {catDataAssembly} from '../../../logging/logging';
import {isAutomaticState, isExtSource, isManualState, isOffState, OperationMode} from '../../core/enum';
import {BaseDataAssemblyRuntime, DataAssembly} from '../DataAssembly';
import {OpcUaDataItem} from '../DataItem';
import {Constructor} from './mixins';

export type OpModeRuntime = BaseDataAssemblyRuntime & {
    StateChannel: OpcUaDataItem<boolean>;
    StateOffAut: OpcUaDataItem<boolean>;
    StateOpAut: OpcUaDataItem<boolean>;
    StateAutAut: OpcUaDataItem<boolean>;
    StateOffOp: OpcUaDataItem<boolean>;
    StateOpOp: OpcUaDataItem<boolean>;
    StateAutOp: OpcUaDataItem<boolean>;
    StateOpAct: OpcUaDataItem<boolean>;
    StateAutAct: OpcUaDataItem<boolean>;
    StateOffAct: OpcUaDataItem<boolean>;
};

// tslint:disable-next-line:variable-name
export function OpModeDA<TBase extends Constructor<DataAssembly>>(Base: TBase) {
    return class extends Base {
        public communication: OpModeRuntime;

        constructor(...args: any[]) {
            super(...args);
            this.createDataItem(args[0], 'StateChannel', 'read', 'boolean');

            this.createDataItem(args[0], 'StateOffAut', 'read', 'boolean');
            this.createDataItem(args[0], 'StateOpAut', 'read', 'boolean');
            this.createDataItem(args[0], 'StateAutAut', 'read', 'boolean');

            this.createDataItem(args[0], 'StateOffOp', 'write', 'boolean');
            this.createDataItem(args[0], 'StateOpOp', 'write', 'boolean');
            this.createDataItem(args[0], 'StateAutOp', 'write', 'boolean');

            this.createDataItem(args[0], 'StateOffAct', 'read', 'boolean');
            this.createDataItem(args[0], 'StateOpAct', 'read', 'boolean');
            this.createDataItem(args[0], 'StateAutAct', 'read', 'boolean');
        }

        public getOperationMode(): OperationMode {
            if (this.communication.StateOffAct.value === true) {
                return OperationMode.Offline;
            } else if (this.communication.StateOpAct.value === true) {
                return OperationMode.Operator;
            } else if (this.communication.StateAutAct.value === true) {
                return OperationMode.Automatic;
            }
        }

        public async waitForOpModeToPassSpecificTest(testFunction: (opMode: OperationMode) => boolean) {
            if (!this.subscriptionActive) {
                await this.subscribe();
            }
            return new Promise((resolve) => {
                if (testFunction(this.getOperationMode())) {
                    resolve();
                } else {
                    this.on('changed', function test() {
                        if (testFunction(this.getOperationMode())) {
                            this.removeListener('changed', test);
                            resolve();
                        }
                    });
                }
            });
        }

        /**
         * Set data assembly to automatic operation mode and source to external source
         */
        public async setToAutomaticOperationMode(): Promise<void> {
            catDataAssembly.debug(`[${this.name}] Current opMode = ${this.getOperationMode()}`);
            if (isOffState(this.getOperationMode())) {
                catDataAssembly.trace(`[${this.name}] First go to Manual state`);
                this.writeOpMode(OperationMode.Operator);
                await this.waitForOpModeToPassSpecificTest(isManualState);
            }

            if (isManualState(this.getOperationMode())) {
                catDataAssembly.trace(`[${this.name}] Then to automatic`);
                this.writeOpMode(OperationMode.Automatic);
                await this.waitForOpModeToPassSpecificTest(isAutomaticState);
            }
        }

        public async setToManualOperationMode() {
            const opMode = this.getOperationMode();
            if (!isManualState(opMode)) {
                this.writeOpMode(OperationMode.Operator);
                await this.waitForOpModeToPassSpecificTest(isManualState);
            }
        }

        public async writeOpMode(opMode: OperationMode) {
            catDataAssembly.debug(`[${this.name}] Write opMode: ${opMode as number}`);
            if (opMode === OperationMode.Automatic) {
                await this.communication.StateAutOp.write(true);
            } else if (opMode === OperationMode.Operator) {
                await this.communication.StateOpOp.write(true);
            } else if (opMode === OperationMode.Offline) {
                await this.communication.StateOffOp.write(true);
            }
            catDataAssembly.debug(`[${this.name}] Setting opMode successfully`);
        }
    };
}
