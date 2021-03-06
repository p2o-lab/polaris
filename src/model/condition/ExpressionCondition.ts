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

import {ExpressionConditionOptions, ScopeOptions} from '@p2olab/polaris-interface';
import {Expression} from 'expr-eval';
import {catCondition} from '../../logging/logging';
import {Module} from '../core/Module';
import {ScopeItem} from '../recipe/ScopeItem';
import {Condition} from './Condition';

export class ExpressionCondition extends Condition {

    private readonly expression: Expression;
    private readonly scopeArray: ScopeItem[];

    /**
     *
     * @param {ExpressionConditionOptions} options
     * @param {Module[]} modules
     */
    constructor(options: ExpressionConditionOptions, modules: Module[] = []) {
        super(options);
        catCondition.info(`Add ExpressionCondition: ${options.expression} ` +
            `(${JSON.stringify(modules.map((m) => m.id))})`);
        // evaluate scopeArray
        this.scopeArray = (options.scope || [])
            .map((item: ScopeOptions) => ScopeItem.extractFromScopeOptions(item, modules));

        // evaluate additional variables from expression
        const extraction = ScopeItem.extractFromExpressionString(
            options.expression,
            modules,
            this.scopeArray.map((scope) => scope.name));
        this.expression = extraction.expression;
        this.scopeArray.push (...extraction.scopeItems);
        this._fulfilled = false;
    }

    public getUsedModules(): Set<Module> {
        return new Set<Module>([...this.scopeArray.map((sa) => sa.module)]);
    }

    public listen(): Condition {
        this.scopeArray.forEach((item) => {
            item.dataAssembly.on('changed', this.boundOnChanged);
        });
        return this;
    }

    public async onChanged() {
        this._fulfilled = this.getValue() as boolean;
        this.emit('stateChanged', this._fulfilled);
    }

    /**
     * calculate value from current scopeArray
     */
    public getValue(): any {
        // get current variables
        const tasks = this.scopeArray.map((item) => {
            return item.getScopeValue();
        });
        const assign = require('assign-deep');
        const scope = assign(...tasks);
        catCondition.trace(`Scope: ${JSON.stringify(scope)}`);
        return this.expression.evaluate(scope);
    }

    public clear() {
        super.clear();
        this.scopeArray.forEach((item) => {
            item.dataAssembly.removeListener('changed', this.boundOnChanged);
        });
    }

    private boundOnChanged = () => this.onChanged();

}
