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
import {OpcUaConnection} from '../../core/OpcUaConnection';
import {OpcUaDataItem} from '../DataItem';
import {SourceModeDA, SourceModeRuntime} from '../mixins/SourceMode';
import {OperationElement, OperationElementRuntime} from './OperationElement';

export type BinManRuntime = OperationElementRuntime & {
    VMan: OpcUaDataItem<boolean>;
    VRbk: OpcUaDataItem<boolean>;
    VFbk: OpcUaDataItem<boolean>;
    VOut: OpcUaDataItem<boolean>;
    VState0: OpcUaDataItem<string>;
    VState1: OpcUaDataItem<string>;
};

export class BinMan extends OperationElement {

    public readonly communication: BinManRuntime;

    constructor(options, module) {
        super(options, module);
        this.communication.VMan = this.createDataItem(['VMan', 'VExt'], 'write', 'boolean');
        this.communication.VRbk = this.createDataItem('VRbk', 'read', 'boolean');
        this.communication.VFbk = this.createDataItem('VFbk', 'read', 'boolean');
        this.communication.VOut = this.createDataItem('VOut', 'read', 'boolean');
        this.communication.VState0 = this.createDataItem('VState0', 'read', 'string');
        this.communication.VState1 = this.createDataItem('VState1', 'read', 'string');
        this.type = 'boolean';
        this.writeDataItem = this.communication.VMan;
        this.readDataItem = this.communication.VOut;
    }

}

export type BinManIntRuntime = BinManRuntime & SourceModeRuntime & {
    VInt: OpcUaDataItem<boolean>;
};

export class BinManInt extends SourceModeDA(BinMan) {

    public readonly communication: BinManIntRuntime;

    constructor(options, connection: OpcUaConnection) {
        super(options, connection);
        this.type = 'number';
        this.communication.VInt = this.createDataItem('VInt', 'read');
    }
}
