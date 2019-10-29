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

/* tslint:disable:max-classes-per-file */
import {OpcUaDataItem} from '../DataItem';
import {IndicatorElement, IndicatorElementRuntime} from './IndicatorElement';

export type BinViewRuntime = IndicatorElementRuntime & {
    V: OpcUaDataItem<boolean>;
    VState0: OpcUaDataItem<string>;
    VState1: OpcUaDataItem<string>;
};

export class BinView extends IndicatorElement {
    public readonly communication: BinViewRuntime;

    constructor(options, module) {
        super(options, module);
        this.communication.V = this.createDataItem('V', 'read', 'boolean');
        this.communication.VState0 = this.createDataItem('VState0', 'read', 'string');
        this.communication.VState1 = this.createDataItem('VState1', 'read', 'string');
        this.type = 'boolean';
        this.readDataItem = this.communication.V;
    }
}

export type BinMonRuntime = BinViewRuntime & {
    VFlutEn: OpcUaDataItem<boolean>;
    VFlutTi: OpcUaDataItem<number>;
    VFlutCnt: OpcUaDataItem<number>;
    VFlutAct: OpcUaDataItem<boolean>;
};

export class BinMon extends BinView {

    public readonly communication: BinMonRuntime;

    constructor(options, module) {
        super(options, module);
        this.communication.VFlutEn = this.createDataItem('VFlutEn', 'read', 'boolean');
        this.communication.VFlutTi = this.createDataItem('VFlutTi', 'write', 'number');
        this.communication.VFlutCnt = this.createDataItem('VFlutCnt', 'write', 'number');
        this.communication.VFlutAct = this.createDataItem('VFlutAct', 'read', 'boolean');
    }
}
