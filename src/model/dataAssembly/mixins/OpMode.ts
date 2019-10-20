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

import {OperationMode} from '@p2olab/polaris-interface';
import {catDataAssembly} from '../../../logging/logging';
import {BaseDataAssemblyRuntime, DataAssembly} from '../DataAssembly';
import {OpcUaDataItem} from '../DataItem';
import {Constructor} from './mixins';

export enum OpMode {
    stateLiOp = 1,
    stateOffLi = 2,
    stateOffOp = 4,
    stateManLi = 8,
    stateManOp = 16,
    stateAutLi = 32,
    stateAutOp = 64,
    stateManAct = 128,
    stateAutAct = 256,
    srcLiOp = 512,
    srcExtLi = 1024,
    srcIntLi = 2048,
    srcIntOp = 4096,
    srcExtOp = 8192,
    srcIntAct = 16384
}

export type OpModeRuntime = BaseDataAssemblyRuntime & {
    OpMode: OpcUaDataItem<number>;

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

/** Add Opmode functionality to OpMode.
 * detects and supports old and new version of OpMode
 */
// tslint:disable-next-line:variable-name
export function OpModeDA<TBase extends Constructor<DataAssembly>>(Base: TBase) {
    return class extends Base {
        public communication: OpModeRuntime;

        public classicOpMode: boolean;

        constructor(...args: any[]) {
            super(...args);
            if (args[0].communication.OpMode) {
                this.classicOpMode = true;
                this.createDataItem(args[0], 'OpMode', 'write');
            } else {
                this.classicOpMode = false;
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
        }

        public getOperationMode(): OperationMode {
            if (this.isOffState()) {
                return OperationMode.Offline;
            } else if (this.isManualState()) {
                return OperationMode.Operator;
            } else if (this.isAutomaticState()) {
                return OperationMode.Automatic;
            }
        }

        public isOpMode(expectedOpMode: OperationMode) {
            switch (expectedOpMode) {
                case OperationMode.Automatic:
                    return this.isAutomaticState();
                case OperationMode.Operator:
                    return this.isManualState();
                case OperationMode.Offline:
                    return this.isOffState();
            }
        }

        public async waitForOpModeToPassSpecificTest(expectedOpMode: OperationMode) {
            await this.subscribe();
            return new Promise((resolve) => {
                if (this.isOpMode(expectedOpMode)) {
                    resolve();
                } else {
                    const da = this;
                    this.on('changed', function test() {
                        if (da.isOpMode(expectedOpMode)) {
                            this.removeListener('OpMode', test);
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
            if (this.isOffState()) {
                catDataAssembly.trace(`[${this.name}] First go to Manual state`);
                this.writeOpMode(OperationMode.Operator);
                await this.waitForOpModeToPassSpecificTest(OperationMode.Operator);
            }

            if (this.isManualState()) {
                catDataAssembly.trace(`[${this.name}] Then to automatic`);
                this.writeOpMode(OperationMode.Automatic);
                await this.waitForOpModeToPassSpecificTest(OperationMode.Automatic);
            }
        }

        public async setToManualOperationMode() {
            if (!this.isManualState()) {
                this.writeOpMode(OperationMode.Operator);
                await this.waitForOpModeToPassSpecificTest(OperationMode.Operator);
            }
        }

        public async writeOpMode(opMode: OperationMode) {
            catDataAssembly.debug(`[${this.name}] Write opMode: ${opMode}`);
            if (opMode === OperationMode.Automatic) {
                if (this.classicOpMode) {
                    await this.communication.OpMode.write(OpMode.stateAutOp);
                } else {
                    await this.communication.StateAutOp.write(true);
                }
            } else if (opMode === OperationMode.Operator) {
                if (this.classicOpMode) {
                    await this.communication.OpMode.write(OpMode.stateManOp);
                } else {
                    await this.communication.StateOpOp.write(true);
                }
            } else if (opMode === OperationMode.Offline) {
                if (this.classicOpMode) {
                    await this.communication.OpMode.write(OpMode.stateOffOp);
                } else {
                    await this.communication.StateOffOp.write(true);
                }
            }
            catDataAssembly.debug(`[${this.name}] Setting opMode successfully`);
        }

        public isOffState(): boolean {
            if (this.classicOpMode) {
                return (this.communication.OpMode.value & (OpMode.stateAutAct | OpMode.stateManAct)) === 0;
            } else {
                return this.communication.StateOffAct.value === true;
            }
        }

        public isAutomaticState(): boolean {
            if (this.classicOpMode) {
                return (this.communication.OpMode.value & OpMode.stateAutAct) === OpMode.stateAutAct;
            } else {
                return this.communication.StateAutAct.value === true;
            }
        }

        public isManualState(): boolean {
            if (this.classicOpMode) {
                return (this.communication.OpMode.value & OpMode.stateManAct) === OpMode.stateManAct;
            } else {
                return this.communication.StateOpAct.value === true;
            }
        }
    };
}
