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
import {OpModeDA, OpModeRuntime} from '../mixins/OpMode';
import {ActiveElement, ActiveElementRuntime} from './ActiveElement';

export type AnaDrvRuntime = ActiveElementRuntime & OpModeRuntime & {
    FwdEn: OpcUaDataItem<boolean>;
    RevEn: OpcUaDataItem<boolean>;
    StopOp: OpcUaDataItem<boolean>;
    FwdOp: OpcUaDataItem<boolean>;
    RevOp: OpcUaDataItem<boolean>;
    StopLi: OpcUaDataItem<boolean>;
    FwdLi: OpcUaDataItem<boolean>;
    RevLi: OpcUaDataItem<boolean>;
    FwdCtrl: OpcUaDataItem<boolean>;
    RevCtrl: OpcUaDataItem<boolean>;
    RevFbkEn: OpcUaDataItem<boolean>;
    FwdFbkEn: OpcUaDataItem<boolean>;
    RevFbk: OpcUaDataItem<boolean>;
    FwdFbk: OpcUaDataItem<boolean>;
    SafePos: OpcUaDataItem<boolean>;
    Trip: OpcUaDataItem<number>;
    RpmSclMax: OpcUaDataItem<number>;
    RpmSclMin: OpcUaDataItem<number>;
    RpmUnit: OpcUaDataItem<number>;
    RpmInt: OpcUaDataItem<number>;
    RpmExt: OpcUaDataItem<number>;
    RpmMin: OpcUaDataItem<number>;
    RpmMax: OpcUaDataItem<number>;
    Rpm: OpcUaDataItem<number>;
    RpmFbk: OpcUaDataItem<number>;
    PermEn: OpcUaDataItem<boolean>;
    Permit: OpcUaDataItem<boolean>;
    IntlEn: OpcUaDataItem<boolean>;
    Interlock: OpcUaDataItem<boolean>;
    ProtEn: OpcUaDataItem<boolean>;
    Protect: OpcUaDataItem<boolean>;
    ResetOp: OpcUaDataItem<boolean>;
    ResetLi: OpcUaDataItem<boolean>;
};

export class AnaDrv extends OpModeDA(ActiveElement) {

    public readonly communication: AnaDrvRuntime;

    constructor(options, connection) {
        super(options, connection);
        this.communication.RpmFbk = this.createDataItem('RpmFbk', 'read');
        this.readDataItem = this.communication.RpmFbk;
        this.writeDataItem = this.communication.RpmExt;
        this.type = 'number';
    }
}

export class MonAnaDrv extends AnaDrv {
    constructor(options, module) {
        super(options, module);
    }
}
