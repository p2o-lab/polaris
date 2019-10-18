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

export type ServiceControlRuntime  = BaseDataAssemblyRuntime & OpModeRuntime & {
    CommandMan: OpcUaDataItem<number>;
    CommandExt: OpcUaDataItem<number>;
    CommandEnable: OpcUaDataItem<number>;
    State: OpcUaDataItem<number>;
    StrategyMan: OpcUaDataItem<number>;
    StrategyExt: OpcUaDataItem<number>;
    StrategyInt: OpcUaDataItem<number>;
    CurrentStrategy: OpcUaDataItem<number>;
};

export class ServiceControl extends OpModeDA(DataAssembly) {
    public readonly communication: ServiceControlRuntime;

    constructor(options, connection) {
        super(options, connection);
        this.createDataItem(options, 'CommandMan', 'write');
        this.createDataItem(options, 'CommandExt', 'write');
        this.createDataItem(options, 'CommandEnable', 'read');
        this.createDataItem(options, 'State', 'read');
        this.createDataItem(options, 'StrategyMan', 'write');
        this.createDataItem(options, 'StrategyExt', 'write');
        this.createDataItem(options, 'StrategyInt', 'read');
        this.createDataItem(options, 'CurrentStrategy', 'read');
    }

}
