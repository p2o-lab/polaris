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

import {StateConditionOptions, VariableConditionOptions} from '@p2olab/polaris-interface';
import {Condition} from 'src/model/condition/Condition';
import {PEA} from '@/model/core/PEA';

export abstract class PEACondition extends Condition {
    protected readonly module: PEA;

    constructor(options: StateConditionOptions | VariableConditionOptions, modules: PEA[]) {
        super(options);
        if (options.module) {
            this.module = modules.find((module) => module.id === options.module);
        } else if (modules.length === 1) {
            this.module = modules[0];
        }
        if (!this.module) {
            throw new Error(`Could not find module ${options.module} in ${JSON.stringify(modules.map((m) => m.id))}`);
        }
    }

    public getUsedModules() {
        return new Set<PEA>().add(this.module);
    }

}
