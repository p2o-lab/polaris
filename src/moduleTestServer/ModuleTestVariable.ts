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

import {DataType, Namespace, UAObject, Variant} from 'node-opcua';
import {catTestServer} from '../logging/logging';
import {ModuleTestOpMode} from './ModuleTestOpMode';

export abstract class TestServerVariable {

    public readonly name: string;
    public opMode: ModuleTestOpMode;
    public wqc: number = 0;
    public osLevel: number = 0;
    protected variableNode: UAObject;

    constructor(namespace: Namespace, rootNode: UAObject, variableName: string) {
        catTestServer.debug(`Add variable ${variableName}`);

        this.name = variableName;

        this.variableNode = namespace.addObject({
            organizedBy: rootNode,
            browseName: variableName
        });

        namespace.addVariable({
            componentOf: this.variableNode,
            nodeId: `ns=1;s=${variableName}.WQC`,
            browseName: `${variableName}.WQC`,
            dataType: DataType.UInt32,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.UInt32, value: this.wqc});
                }
            }
        });

        namespace.addVariable({
            componentOf: this.variableNode,
            nodeId: `ns=1;s=${variableName}.OSLevel`,
            browseName: `${variableName}.OSLevel`,
            dataType: DataType.UInt32,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.UInt32, value: this.osLevel});
                }
            }
        });

        this.opMode = new ModuleTestOpMode(namespace, this.variableNode, variableName);
    }
}
