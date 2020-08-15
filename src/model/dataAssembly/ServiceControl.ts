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

import {BaseDataAssemblyRuntime, DataAssembly} from './DataAssembly';
import {OpcUaDataItem} from './DataItem';
import {OpModeDA, OpModeRuntime} from './mixins/OpMode';
import {SourceModeDA, SourceModeRuntime} from './mixins/SourceMode';
import {WritableDataAssembly} from './WritableDataAssembly';

export type ServiceControlRuntime  = BaseDataAssemblyRuntime & OpModeRuntime & SourceModeRuntime & {
    CommandMan: OpcUaDataItem<number>;
    CommandExt: OpcUaDataItem<number>;
    CommandEnable: OpcUaDataItem<number>;
    State: OpcUaDataItem<number>;
    StrategyMan: OpcUaDataItem<number>;
    StrategyExt: OpcUaDataItem<number>;
    StrategyInt: OpcUaDataItem<number>;
    CurrentStrategy: OpcUaDataItem<number>;
};

export class ServiceControl extends OpModeDA(SourceModeDA(WritableDataAssembly)) {
    public readonly communication: ServiceControlRuntime;

    constructor(options, connection) {
        super(options, connection);
        this.communication.CommandMan = this.createDataItem(['CommandMan', 'ControlOp'], 'write');
        this.communication.CommandExt = this.createDataItem(['CommandExt', 'ControlExt'], 'write');
        this.communication.CommandEnable = this.createDataItem(['CommandEnable', 'ControlEnable'], 'read');
        this.communication.State = this.createDataItem('State', 'read');
        this.communication.StrategyMan = this.createDataItem(['StrategyMan', 'StrategyOp'], 'write');
        this.communication.StrategyExt = this.createDataItem('StrategyExt', 'write');
        this.communication.StrategyInt = this.createDataItem('StrategyInt', 'read');
        this.communication.CurrentStrategy = this.createDataItem(['CurrentStrategy', 'Strategy'], 'read');

        this.readDataItem = this.communication.State;
        this.writeDataItem = this.communication.CommandExt;
    }

}
