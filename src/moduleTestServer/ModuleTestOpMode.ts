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

import {DataType, Namespace, StatusCodes, UAObject, Variant} from 'node-opcua';
import {OperationMode} from '../model/core/enum';

export class ModulTestOpMode {
    public opMode: OperationMode = OperationMode.Offline;
    public stateChannel: boolean = false;
    public stateOffAut: boolean = false;
    public stateOpAut: boolean = false;
    public stateAutAut: boolean = false;
    public stateOffOp: boolean = false;
    public stateOpOp: boolean = false;
    public stateAutOp: boolean = false;

    constructor(namespace: Namespace, rootNode: UAObject, variableName: string) {
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateChannel`,
            browseName: `${variableName}.StateChannel`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateChannel});
                }
            }
        });

        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateOffAut`,
            browseName: `${variableName}.StateOffAut`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateOffAut});
                }
            }
        });
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateOpAut`,
            browseName: `${variableName}.StateOpAut`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateOpAut});
                }
            }
        });
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateAutAut`,
            browseName: `${variableName}.StateAutAut`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateAutAut});
                }
            }
        });

        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateOffOp`,
            browseName: `${variableName}.StateOffOp`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateOffOp});
                },
                set: (variant) => {
                    this.stateOffOp = variant.value;
                    if (this.stateOffOp) {
                        global.setInterval(() => {
                            if (this.stateOpAct && !this.stateChannel) {
                                this.opMode = OperationMode.Offline;
                            }
                            this.stateOffOp = false;
                        }, 100);
                    }
                    return StatusCodes.Good;
                }
            }
        });
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateOpOp`,
            browseName: `${variableName}.StateOpOp`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateOpOp});
                },
                set: (variant) => {
                    this.stateOpOp = variant.value;
                    if (this.stateOpOp) {
                        global.setInterval(() => {
                            if (!this.stateChannel) {
                                this.opMode = OperationMode.Operator;
                            }
                            this.stateOpOp = false;
                        }, 100);
                    }
                    return StatusCodes.Good;
                }
            }
        });
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateAutOp`,
            browseName: `${variableName}.StateAutOp`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateAutOp});
                },
                set: (variant) => {
                    this.stateAutOp = variant.value;
                    if (this.stateAutOp) {
                        global.setInterval(() => {
                            if (this.stateOpAct && this.stateOpAct && !this.stateChannel) {
                                this.opMode = OperationMode.Automatic;
                            }
                            this.stateAutOp = false;
                        }, 100);
                    }
                    return StatusCodes.Good;
                }
            }
        });

        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateOffAct`,
            browseName: `${variableName}.StateOffAct`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateOffAct});
                }
            }
        });
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateOpAct`,
            browseName: `${variableName}.StateOpAct`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateOpAct});
                }
            }
        });
        namespace.addVariable({
            componentOf: rootNode,
            nodeId: `ns=1;s=${variableName}.StateAutAct`,
            browseName: `${variableName}.StateAutAct`,
            dataType: DataType.Boolean,
            value: {
                get: () => {
                    return new Variant({dataType: DataType.Boolean, value: this.stateAutAct});
                }
            }
        });
    }

    public stateOpAct(): boolean {
        return this.opMode === OperationMode.Operator;
    }
    public stateAutAct(): boolean {
        return this.opMode === OperationMode.Automatic;
    }
    public get stateOffAct(): boolean {
        return this.opMode === OperationMode.Offline;
    }
}
