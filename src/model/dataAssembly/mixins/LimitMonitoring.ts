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

import {BaseDataAssemblyRuntime, DataAssembly} from '../DataAssembly';
import {OpcUaDataItem} from '../DataItem';
import {Constructor} from './mixins';

export type LimitMonitoringRuntime = BaseDataAssemblyRuntime & {
    VAHEn: OpcUaDataItem<boolean>;
    VAHLim: OpcUaDataItem<number>;
    VAHAct: OpcUaDataItem<boolean>;
    VWHEn: OpcUaDataItem<boolean>;
    VWHLim: OpcUaDataItem<number>;
    VWHAct: OpcUaDataItem<boolean>;
    VTHEn: OpcUaDataItem<boolean>;
    VTHLim: OpcUaDataItem<number>;
    VTHAct: OpcUaDataItem<boolean>;
    VALEn: OpcUaDataItem<boolean>;
    VALLim: OpcUaDataItem<number>;
    VALAct: OpcUaDataItem<boolean>;
    VWLEn: OpcUaDataItem<boolean>;
    VWLLim: OpcUaDataItem<number>;
    VWLAct: OpcUaDataItem<boolean>;
    VTLEn: OpcUaDataItem<boolean>;
    VTLLim: OpcUaDataItem<number>;
    VTLAct: OpcUaDataItem<boolean>;
};

// tslint:disable-next-line:variable-name
export function LimitMonitoringDA<TBase extends Constructor<DataAssembly>>(Base: TBase) {
    return class extends Base {
        public communication: LimitMonitoringRuntime;

        constructor(...args: any[]) {
            super(...args);
            this.communication.VAHEn = this.createDataItem(['AHEn', 'VAHEn'], 'read', 'boolean');
            this.communication.VAHLim = this.createDataItem(['AHLim', 'VAHLim'], 'write');
            this.communication.VAHAct = this.createDataItem(['AHAct', 'VAHAct'], 'read', 'boolean');

            this.communication.VWHEn = this.createDataItem(['WHEn', 'VWHEn'], 'read', 'boolean');
            this.communication.VWHLim = this.createDataItem(['WHLim', 'VWHLim'], 'write');
            this.communication.VWHAct = this.createDataItem(['WHAct', 'VWHAct'], 'read', 'boolean');

            this.communication.VTHEn = this.createDataItem(['THEn', 'VTHEn'], 'read', 'boolean');
            this.communication.VTHLim = this.createDataItem(['THLim', 'VTHLim'], 'write');
            this.communication.VTHAct = this.createDataItem(['THAct', 'VTHAct'], 'read', 'boolean');

            this.communication.VTLEn = this.createDataItem(['TLEn', 'VTLEn'], 'read', 'boolean');
            this.communication.VTLLim = this.createDataItem(['TLLim', 'VTLLim'], 'write');
            this.communication.VTLAct = this.createDataItem(['TLAct', 'VTLAct'], 'read', 'boolean');

            this.communication.VWLEn = this.createDataItem(['WLEn', 'VWLEn'], 'read', 'boolean');
            this.communication.VWLLim = this.createDataItem(['WLLim', 'VWLLim'], 'write');
            this.communication.VWLAct = this.createDataItem(['WLAct', 'VWLAct'], 'read', 'boolean');

            this.communication.VALEn = this.createDataItem(['ALEn', 'VALEn'], 'read', 'boolean');
            this.communication.VALLim = this.createDataItem(['ALLim', 'VALLim'], 'write');
            this.communication.VALAct = this.createDataItem(['ALAct', 'VALAct'], 'read', 'boolean');
        }
    };
}
