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

import {ParameterInterface, ParameterOptions} from '@p2olab/polaris-interface';
import {catDataAssembly} from '../../logging/logging';
import {Parameter} from '../recipe/Parameter';
import {DataAssembly} from './DataAssembly';
import {DataItem} from './DataItem';

// tslint:disable-next-line:variable-name
export class WritableDataAssembly extends DataAssembly {
    public parameterRequest: Parameter;
    public requestedValue: string;
    public writeDataItem: DataItem<any> = null;

    public toJson(): ParameterInterface {
        return {
            ...super.toJson(),
            requestedValue: this.requestedValue,
            readonly: false
        };
    }

    /**
     * Set parameter on module
     * @param paramValue
     * @param {string} variable
     */
    public async setParameter(paramValue: any, variable?: string) {
        let dataItem: DataItem<any>;
        if (variable) {
            dataItem = this.communication[variable];
        } else {
            dataItem = this.writeDataItem;
        }
        catDataAssembly.debug(`Set Parameter: ${this.name} (${variable}) -> ${JSON.stringify(paramValue)}`);
        await dataItem.write(paramValue);
    }

    public async setValue(p: ParameterOptions, modules: any[]) {
        catDataAssembly.debug(`set value: ${JSON.stringify(p)}`);
        if (p.value) {
            this.requestedValue = p.value.toString();

            if (this.parameterRequest) {
                this.parameterRequest.unlistenToScopeArray();

                if (this.parameterRequest.eventEmitter) {
                    this.parameterRequest.eventEmitter.removeListener('changed', this.setParameter);
                }
            }

            this.parameterRequest = new Parameter(p, modules);

            const value = this.parameterRequest.getValue();
            catDataAssembly.trace(`calculated value: ${value}`);
            await this.setParameter(value);

            if (this.parameterRequest.options.continuous) {
                catDataAssembly.trace(`Continuous parameter change`);
                this.parameterRequest.listenToScopeArray()
                    .on('changed', (data) => this.setParameter(data));
            }
        }
    }
}
