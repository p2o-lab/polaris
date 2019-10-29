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
import {LimitMonitoringDA} from '../mixins/LimitMonitoring';
import {ScaleSettingsDA, ScaleSettingsRuntime} from '../mixins/ScaleSettings';
import {UnitDA, UnitDataAssemblyRuntime} from '../mixins/Unit';
import {IndicatorElement, IndicatorElementRuntime} from './IndicatorElement';

export type DIntViewRuntime = IndicatorElementRuntime & UnitDataAssemblyRuntime & ScaleSettingsRuntime & {
    V: OpcUaDataItem<number>;
};

export class DIntView extends ScaleSettingsDA(UnitDA(IndicatorElement)) {
    public readonly communication: DIntViewRuntime;

    constructor(options, connection) {
        super(options, connection);
        this.communication.V = this.createDataItem('V', 'read');
        this.type = 'number';
        this.readDataItem = this.communication.V;
    }
}

export class DIntMon extends LimitMonitoringDA(DIntView) {
}
