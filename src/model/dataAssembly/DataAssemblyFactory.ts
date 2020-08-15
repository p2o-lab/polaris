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

import {DataAssemblyOptions} from '@p2olab/polaris-interface';
import {catDataAssembly} from '../../logging/logging';
import {OpcUaConnection} from '../core/OpcUaConnection';
import {AnaDrv, MonAnaDrv} from './activeElements/Drv';
import {AnaVlv, BinVlv, MonAnaVlv, MonBinVlv} from './activeElements/Vlv';
import {DataAssembly} from './DataAssembly';
import {AnaMon, AnaView} from './indicatorElement/AnaView';
import {BinMon, BinView} from './indicatorElement/BinView';
import {DIntMon, DIntView} from './indicatorElement/DIntView';
import {StrView} from './indicatorElement/StrView';
import {AnaMan, AnaManInt} from './operationElement/AnaMan';
import {BinMan, BinManInt} from './operationElement/BinMan';
import {DIntMan, DIntManInt} from './operationElement/DIntMan';
import {ServiceControl} from './ServiceControl';

export class DataAssemblyFactory {
    public static create(variableOptions: DataAssemblyOptions, connection: OpcUaConnection): DataAssembly {
        catDataAssembly.debug(`Create DataAssembly ${variableOptions.name} (${variableOptions.interface_class})`);
        const types = {
            'AnaView': AnaView,
            'AnaMon': AnaMon,
            'ExtAnaOp': AnaMan,
            'AnaMan': AnaMan,
            'ExtIntAnaOp': AnaManInt,
            'AnaManInt': AnaManInt,
            'AdvAnaOp': AnaManInt,
            'AnaServParam': AnaManInt,

            'BinView': BinView,
            'BinMon': BinMon,
            'ExtBinOp': BinMan,
            'BinMan': BinMan,
            'ExtIntBinOp': BinManInt,
            'BinManInt': BinManInt,
            'AdvBinOp': BinManInt,
            'BinServParam': BinManInt,

            'DigView': DIntView,
            'DigMon': DIntMon,
            'ExtDigOp': DIntMan,
            'DIntMan': DIntMan,
            'ExtIntDigOp': DIntManInt,
            'DIntManInt': DIntManInt,
            'AdvDigOp': DIntManInt,
            'DigServParam': DIntManInt,

            'BinVlv': BinVlv,
            'MonBinVlv': MonBinVlv,
            'AnaVlv': AnaVlv,
            'MonAnaVlv': MonAnaVlv,

            'AnaDrv': AnaDrv,
            'MonAnaDrv': MonAnaDrv,

            'StrView': StrView,

            'ServiceControl': ServiceControl
        };
        let type = types[variableOptions.interface_class];
        if (!type) {
            if (!variableOptions.interface_class) {
                catDataAssembly.debug(`No interface class specified for DataAssembly ${variableOptions.name}. ` +
                    `Use standard DataAssembly.`);
            } else {
                catDataAssembly.warn(`No data assembly implemented for ${variableOptions.interface_class} ` +
                    `of ${variableOptions.name}. Use standard DataAssembly.`);
            }
            type = DataAssembly;
        }

        const instance: DataAssembly = new type(variableOptions, connection);
        instance.logParsingErrors();
        return instance;
    }
}
