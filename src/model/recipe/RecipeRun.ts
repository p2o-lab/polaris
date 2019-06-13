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

import {RecipeRunInterface} from '@p2olab/polaris-interface';
import {v4} from 'uuid';
import {ServiceLogEntry, VariableLogEntry} from '../../logging/archive';
import {Recipe} from './Recipe';

/** One specific recipe run with all logs
 *
 */
export class RecipeRun {
    get startTime(): Date {
        return this._startTime;
    }
    get endTime(): Date {
        return this._endTime;
    }

    public readonly id: string;
    public readonly recipe: Recipe;

    public serviceLog: ServiceLogEntry[] = [];
    public variableLog: VariableLogEntry[] = [];
    private _startTime: Date;
    private _endTime: Date;

    constructor(recipe: Recipe) {
        this.id = v4();
        this.recipe = recipe;
    }

    public json(): RecipeRunInterface {
        return {
            id: this.id,
            startTime: this._startTime,
            endTime: this._endTime,
            recipe: this.recipe.options,
            serviceLog: this.serviceLog,
            variableLog: this.variableLog
        };
    }

    /** Starts the linked recipe
     *
     */
    public async start(): Promise<Recipe> {
        this._startTime = new Date();
        this.recipe.once('completed', () => {
            this._endTime = new Date();
        });
        return await this.recipe.start();
    }
}
