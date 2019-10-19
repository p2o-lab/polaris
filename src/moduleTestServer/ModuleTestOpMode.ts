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

import {Namespace, UAObject} from 'node-opcua-address-space';
import {StatusCodes} from 'node-opcua-constants';
import {DataType, Variant} from 'node-opcua-variant';
import {catTestServer} from '../config/logging';
import {OpMode} from '../model/dataAssembly/mixins/OpMode';

export class ModuleTestOpMode {
    public opMode: number = 0;

    constructor(namespace: Namespace, rootNode: UAObject, variableName: string) {
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.OpMode`,
            browseName: `${variableName}.OpMode`,
            dataType: DataType.UInt32,
            value: {
                get: () => {
                    catTestServer.debug(`[${variableName}] Get Opmode in testserver ${this.opMode}`);
                    return new Variant({dataType: DataType.UInt32, value: this.opMode});
                },
                set: (variant) => {
                    const opModeInt = parseInt(variant.value, 10);
                    if (opModeInt === OpMode.stateManOp) {
                        this.opMode = this.opMode & ~OpMode.stateAutAct;
                        this.opMode = this.opMode | OpMode.stateManAct;
                    } else if (opModeInt === OpMode.stateAutOp) {
                        this.opMode = this.opMode & ~OpMode.stateManAct;
                        this.opMode = this.opMode | OpMode.stateAutAct;
                        this.opMode = this.opMode | OpMode.srcIntAct;
                    } else if (opModeInt === OpMode.srcExtOp) {
                        this.opMode = this.opMode & ~OpMode.srcIntAct;
                    } else {
                        return StatusCodes.Bad;
                        }
                    catTestServer.info(`[${variableName}] Set Opmode in testserver ${opModeInt} -> ${this.opMode}`);
                    return StatusCodes.Good;
                }
            }
        });
    }
}
