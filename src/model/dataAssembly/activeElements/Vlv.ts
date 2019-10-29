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
import {BaseDataAssemblyRuntime, DataAssembly} from '../DataAssembly';
import {OpcUaDataItem} from '../DataItem';
import {OpModeDA, OpModeRuntime} from '../mixins/OpMode';
import {ActiveElement, ActiveElementRuntime} from './ActiveElement';

export type BinVlvRuntime = ActiveElementRuntime & OpModeRuntime & {
    SafePos: OpcUaDataItem<boolean>;
    OpenOp: OpcUaDataItem<boolean>;
    CloseOp: OpcUaDataItem<boolean>;
    OpenLi: OpcUaDataItem<boolean>;
    CloseLi: OpcUaDataItem<boolean>;
    Ctrl: OpcUaDataItem<boolean>;
    OpenFbkEn: OpcUaDataItem<boolean>;
    CloseFbkEn: OpcUaDataItem<boolean>;
    OpenFbk: OpcUaDataItem<boolean>;
    CloseFbk: OpcUaDataItem<boolean>;
    PermEn: OpcUaDataItem<boolean>;
    Permit: OpcUaDataItem<boolean>;
    IntlEn: OpcUaDataItem<boolean>;
    Interlock: OpcUaDataItem<boolean>;
    ProtEn: OpcUaDataItem<boolean>;
    Protect: OpcUaDataItem<boolean>;
    ResetOp: OpcUaDataItem<boolean>;
    ResetLi: OpcUaDataItem<boolean>;
};

export class BinVlv extends OpModeDA(ActiveElement) {
    public readonly communication: BinVlvRuntime;
}

export type MonBinVlvRuntime = BinVlvRuntime & {
    MonEn: OpcUaDataItem<boolean>;
    MonSafePos: OpcUaDataItem<boolean>;
    MonStatErr: OpcUaDataItem<boolean>;
    MonDynErr: OpcUaDataItem<boolean>;
    MonStatTi: OpcUaDataItem<number>;
    MonDynTi: OpcUaDataItem<number>;
};

export class MonBinVlv extends BinVlv {
    public readonly communication: MonBinVlvRuntime;
}

export type AnaVlvRuntime = ActiveElementRuntime & OpModeRuntime & {
    OpenOp: OpcUaDataItem<number>;
    CloseOp: OpcUaDataItem<number>;
    OpenLi: OpcUaDataItem<number>;
    CloseLi: OpcUaDataItem<number>;
    Ctrl: OpcUaDataItem<number>;
    OpenFbkEn: OpcUaDataItem<boolean>;
    CloseFbkEn: OpcUaDataItem<boolean>;
    OpenFbk: OpcUaDataItem<boolean>;
    CloseFbk: OpcUaDataItem<boolean>;
    PosSclMin: OpcUaDataItem<number>;
    PosSclMax: OpcUaDataItem<number>;
    PosUnit: OpcUaDataItem<number>;
    PosInt: OpcUaDataItem<number>;
    PosExt: OpcUaDataItem<number>;
    PosMin: OpcUaDataItem<number>;
    PosMax: OpcUaDataItem<number>;
    SafePos: OpcUaDataItem<number>;
    PosCtrl: OpcUaDataItem<number>;
    PosFbkEn: OpcUaDataItem<boolean>;
    PosFbk: OpcUaDataItem<number>;
    PermEn: OpcUaDataItem<boolean>;
    Permit: OpcUaDataItem<boolean>;
    IntlEn: OpcUaDataItem<boolean>;
    Interlock: OpcUaDataItem<boolean>;
    ProtEn: OpcUaDataItem<boolean>;
    Protect: OpcUaDataItem<boolean>;
    ResetOp: OpcUaDataItem<boolean>;
    ResetLi: OpcUaDataItem<boolean>;
};

export class AnaVlv extends OpModeDA(ActiveElement) {
    public readonly communication: AnaVlvRuntime;
}

export type MonAnaVlvRuntime = AnaVlvRuntime & {
    MonEn: OpcUaDataItem<boolean>;
    MonSafePos: OpcUaDataItem<number>;
    MonStatErr: OpcUaDataItem<boolean>;
    MonDynErr: OpcUaDataItem<boolean>;
    MonStatTi: OpcUaDataItem<number>;
    MonDynTi: OpcUaDataItem<number>;
    PosOpngFbk: OpcUaDataItem<number>;
    PosClsngFbk: OpcUaDataItem<number>;
    PosReachedFbk: OpcUaDataItem<boolean>;
    PosTolerance: OpcUaDataItem<number>;
    PosDefClose: OpcUaDataItem<number>;
    PosDefOpen: OpcUaDataItem<number>;
    MonPosTi: OpcUaDataItem<number>;
    MonPosErr: OpcUaDataItem<boolean>;
};

export class MonAnaVlv extends AnaVlv {
    public readonly communication: MonAnaVlvRuntime;
}
