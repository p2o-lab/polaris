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

import {SourceMode} from '@p2olab/polaris-interface';
import {catDataAssembly} from '../../../logging/logging';
import {BaseDataAssemblyRuntime, DataAssembly} from '../DataAssembly';
import {OpcUaDataItem} from '../DataItem';
import {Constructor} from './mixins';
import {OpMode} from './OpMode';

export type SourceModeRuntime = BaseDataAssemblyRuntime & {
    OpMode: OpcUaDataItem<number>;

    SrcChannel: OpcUaDataItem<boolean>;
    SrcManAut: OpcUaDataItem<boolean>;
    SrcIntAut: OpcUaDataItem<boolean>;
    SrcManOp: OpcUaDataItem<boolean>;
    SrcIntOp: OpcUaDataItem<boolean>;
    SrcManAct: OpcUaDataItem<boolean>;
    SrcIntAct: OpcUaDataItem<boolean>;
};

// tslint:disable-next-line:variable-name
export function SourceModeDA<TBase extends Constructor<DataAssembly>>(Base: TBase) {
    return class extends Base {
        public communication: SourceModeRuntime;

        public classicOpMode: boolean;

        constructor(...args: any[]) {
            super(...args);
            if (args[0].communication.OpMode) {
                this.classicOpMode = true;
                this.communication.OpMode = this.createDataItem('OpMode', 'write');
            } else {
                this.classicOpMode = false;
                this.communication.SrcChannel = this.createDataItem('SrcChannel', 'read', 'boolean');

                this.communication.SrcManAut = this.createDataItem('SrcManAut', 'read', 'boolean');
                this.communication.SrcIntAut = this.createDataItem('SrcIntAut', 'read', 'boolean');

                this.communication.SrcManOp = this.createDataItem('SrcManOp', 'write', 'boolean');
                this.communication.SrcIntOp = this.createDataItem('SrcIntOp', 'write', 'boolean');

                this.communication.SrcManAct = this.createDataItem('SrcManAct', 'read', 'boolean');
                this.communication.SrcIntAct = this.createDataItem('SrcIntAct', 'read', 'boolean');
            }
        }

        public getSourceMode(): SourceMode {
            if (this.isExtSource()) {
                return SourceMode.Manual;
            } else if (this.isIntSource()) {
                return SourceMode.Intern;
            }
        }

        public isSourceMode(expectedSourceMode: SourceMode) {
            switch (expectedSourceMode) {
                case SourceMode.Intern:
                    return this.isIntSource();
                case SourceMode.Manual:
                    return this.isExtSource();
            }
        }

        public async waitForSourceModeToPassSpecificTest(expectedSourceMode: SourceMode) {
            await this.subscribe();
            return new Promise((resolve) => {
                if (this.isSourceMode(expectedSourceMode)) {
                    resolve();
                } else {
                    const da = this;
                    this.on('changed', function test() {
                        if (da.isSourceMode(expectedSourceMode)) {
                            this.removeListener('OpMode', test);
                            resolve();
                        }
                    });
                }
            });
        }

        /**
         * Set data assembly to external source mode
         */
        public async setToExternalSourceMode(): Promise<void> {
             if (!this.isExtSource()) {
                catDataAssembly.trace(`[${this.name}] Finally to Ext`);
                this.writeSourceMode(SourceMode.Manual);
                await this.waitForSourceModeToPassSpecificTest(SourceMode.Manual);
            }
        }

        public async setToInternalSourceMode(): Promise<void> {
            if (!this.isIntSource()) {
                catDataAssembly.trace(`[${this.name}] Finally to Int`);
                this.writeSourceMode(SourceMode.Intern);
                await this.waitForSourceModeToPassSpecificTest(SourceMode.Intern);
            }
        }

        public async writeSourceMode(sourceMode: SourceMode) {
            catDataAssembly.debug(`[${this.name}] Write sourceMode: ${sourceMode}`);
            if (sourceMode === SourceMode.Manual) {
                if (this.classicOpMode) {
                    await this.communication.OpMode.write(OpMode.srcExtOp);
                } else {
                    await this.communication.SrcManOp.write(true);
                }
            } else if (sourceMode === SourceMode.Intern) {
                if (this.classicOpMode) {
                    await this.communication.OpMode.write(OpMode.srcIntOp);
                } else {
                    await this.communication.SrcIntOp.write(true);
                }
            }
            catDataAssembly.debug(`[${this.name}] Setting sourceMode successfully`);
        }

        public isExtSource(): boolean {
            return (this.communication.OpMode.value & OpMode.srcIntAct) === 0;
        }

        public isIntSource(): boolean {
            return (this.communication.OpMode.value & OpMode.srcIntAct) === OpMode.srcIntAct;
        }

    };
}
