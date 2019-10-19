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

import {OpcUaNodeOptions, OperationMode, ServiceControlOptions, SourceMode} from '@p2olab/polaris-interface';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import {Module} from '../../../src/model/core/Module';
import {OpcUaConnection} from '../../../src/model/core/OpcUaConnection';
import {AdvAnaOp, AnaServParam, ExtAnaOp, ExtIntAnaOp} from '../../../src/model/dataAssembly/AnaOp';
import {AnaView} from '../../../src/model/dataAssembly/AnaView';
import {BinMon, BinView} from '../../../src/model/dataAssembly/BinView';
import {DataAssembly} from '../../../src/model/dataAssembly/DataAssembly';
import {DataAssemblyFactory} from '../../../src/model/dataAssembly/DataAssemblyFactory';
import {ExtIntDigOp} from '../../../src/model/dataAssembly/DigOp';
import {DigMon} from '../../../src/model/dataAssembly/DigView';
import {MonAnaDrv} from '../../../src/model/dataAssembly/Drv';
import {ServiceControl} from '../../../src/model/dataAssembly/ServiceControl';
import {StrView} from '../../../src/model/dataAssembly/Str';
import {ModuleTestServer} from '../../../src/moduleTestServer/ModuleTestServer';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('DataAssembly', () => {

    describe('static', () => {

        it('should use default Data assembly when provided type not found', () => {
            const da1 = DataAssemblyFactory.create({
                name: 'xyz',
                interface_class: 'SomethingStrange',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: {},
                    WQC: null,
                    V: {value: 22},
                    VState0: {value: 'on'},
                    VState1: {value: 'off'}
                } as any
            }, new OpcUaConnection(null, null));
            expect(da1 instanceof DataAssembly).to.equal(true);
            expect(da1.toJson()).to.deep.equal({
                name: 'xyz',
                readonly: true,
                timestamp: undefined,
                type: 'number',
                value: undefined
            });

            const da2 = DataAssemblyFactory.create({
                name: 'xyz2',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: null,
                    WQC: null
                }
            } as any, new OpcUaConnection(null, null));
            expect(da2 instanceof DataAssembly).to.equal(true);
        });

        it('should fail with missing communication options', () => {
            expect(() => new DataAssembly({
                    name: 'name',
                    communication: null,
                    interface_class: 'analogitem'
                }, new OpcUaConnection(null, null))
            ).to.throw('Communication variables missing while creating DataAssembly');
        });

        it('should fail with missing parameters', () => {
            expect(() => new DataAssembly(undefined, undefined)).to.throw();
        });

        it('should fail with xyz', () => {
            const opcUaNode: OpcUaNodeOptions = {
                namespace_index: 'CODESYSSPV3/3S/IecVarAccess',
                node_id: 'i=12',
                data_type: 'Float'
            };
            expect(() => new DataAssembly({
                    name: 'name',
                    communication: {
                        TagName: opcUaNode as OpcUaNodeOptions,
                        TagDescription: opcUaNode as OpcUaNodeOptions,
                        OSLevel: opcUaNode as OpcUaNodeOptions,
                        WQC: null,
                        access: 'read'
                    } as any,
                    interface_class: 'analogitem'
                }, undefined)
            ).to.throw('No connection defined for creating data assembly');
        });

        it('should fail without provided module', async () => {
            expect(() => DataAssemblyFactory.create(
                {name: 'test', interface_class: 'none', communication: null}, null)
            ).to.throw('No connection defined for creating data assembly');

        });

        it('should have correct createDataItem method', async () => {
            const options = {
                name: 'test', interface_class: 'DataAssembly', communication: {
                    OSLevel: {
                        namespace_index: 'CODESYSSPV3/3S/IecVarAccess',
                        node_id: 'i=1',
                        data_type: 'Float'
                    },
                    TagDescription: {
                        namespace_index: 'CODESYSSPV3/3S/IecVarAccess',
                        node_id: 'i=2',
                        data_type: 'Float'
                    },
                    TagName: {
                        namespace_index: 'CODESYSSPV3/3S/IecVarAccess',
                        node_id: 'i=3',
                        data_type: 'Float'
                    },
                    WQC: {
                        namespace_index: 'CODESYSSPV3/3S/IecVarAccess',
                        node_id: 'i=4',
                        data_type: 'Float'
                    },
                    CurrentStrategy: {
                        namespace_index: 'CODESYSSPV3/3S/IecVarAccess',
                        node_id: 'i=5',
                        data_type: 'Int'
                    }
                } as any
            };
            const da1 = new DataAssembly(options, new OpcUaConnection(null, null));
            expect(da1.communication.WQC).to.not.equal(undefined);
            expect(da1.communication.TagName).to.not.equal(undefined);

            expect(da1.createDataItem('NotThere', 'read')).to.equal(undefined);
            expect(da1.createDataItem(['notThere', 'neitherThere'], 'read')).to.equal(undefined);
            expect(da1.createDataItem('TagName', 'read')).to.not.equal(undefined);
            expect(da1.createDataItem(['notThere', 'TagName'], 'read')).to.not.equal(undefined);
            expect(da1.createDataItem(['CurrentStrategy', 'TagName'], 'read'))
                .to.have.property('nodeId', 'i=5');
            expect(da1.createDataItem(['abc', 'CurrentStrategy', 'TagName'], 'read'))
                .to.have.property('nodeId', 'i=5');

            expect(da1.parsingErrors).to.have.lengthOf(2);
        });

        it('should create ServiceControl', async () => {
            const da1 = DataAssemblyFactory.create({
                name: 'serviceControl1',
                interface_class: 'ServiceControl',
                communication: {
                    OSLevel: {},
                    TagDescription: null,
                    WQC: null,
                    CommandMan: {
                        nodeId: 'sdf'
                    },
                    CommandExt: {}
                } as any
            }, new OpcUaConnection(null, null));
            expect(da1 instanceof ServiceControl).to.equal(true);
            expect((da1 as ServiceControl).communication.CommandMan).to.not.equal(undefined);
            expect(da1.communication.WQC).to.equal(undefined);
            expect(da1.communication.TagName).to.equal(undefined);
        });

        it('should have correct check for ServiceControl', async () => {
            const da1: ServiceControl = DataAssemblyFactory.create({
                name: 'serviceControl1',
                interface_class: 'ServiceControl',
                communication: {
                    OSLevel: {value: 0},
                    TagDescription: {value: 0},
                    WQC: {value: 0},
                    CommandMan: {value: 0},
                    CommandExt: {value: 0},
                    CommandEnable: {value: 0},
                    State: {value: 0},
                    TagName: {value: 'a'},
                    CurrentStrategy: {value: 0},
                    StrategyInt: {value: 0},
                    StrategyExt: {value: 0},
                    StrategyMan: {value: 0},
                    OpMode: {value: 0}
                } as ServiceControlOptions
            }, new OpcUaConnection(null, null)) as ServiceControl;
        });

        it('should have false check for ServiceControl', async () => {
            const da1: ServiceControl = DataAssemblyFactory.create({
                name: 'serviceControl1',
                interface_class: 'ServiceControl',
                communication: {
                    OSLevel: {value: 0},
                    TagDescription: {value: 0},
                    WQC: {value: 0},
                    CommandMan: {value: 0},
                    CommandExt: {value: 0},
                    CommandEnable: {value: 0},
                } as ServiceControlOptions
            }, new OpcUaConnection(null, null)) as ServiceControl;
        });

        it('should create AnaView', async () => {
            const moduleCifJson = JSON.parse(fs.readFileSync('assets/modules/module_cif.json').toString()).modules[0];

            const daJson1 = moduleCifJson.process_values.find((d) => d.name === 'Test_AnaView.L004');
            const daJson2 = moduleCifJson.process_values.find((d) => d.name === 'Sensoren.L001');

            const da1 = DataAssemblyFactory.create(daJson1, new OpcUaConnection(null, null));
            const da2 = DataAssemblyFactory.create(daJson2, new OpcUaConnection(null, null));

            expect(da1 instanceof AnaView).to.equal(true);
            expect(da1 instanceof ExtIntAnaOp).to.equal(false);
            expect(da1 instanceof AdvAnaOp).to.equal(false);

            expect(da1 instanceof AnaView).to.equals(true);
            if (da1 instanceof AnaView) {
                expect(da1.communication.OSLevel).to.have.property('access', 'write');
                expect(da1.communication.V).to.have.property('access', 'read');
                expect(da1.communication.VSclMin).to.have.property('value', 0);
                expect(da1.communication.VSclMax).to.have.property('value', 35.5);
                expect(da1.communication.V).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.Application.Test_AnaView.L001_PV.rPV');
                expect(da1.communication.VUnit).to.have.property('value', 1038);
                expect(da1.getUnit()).to.equal('L');

                let json = da1.toJson();
                expect(json).to.have.property('name', 'Test_AnaView.L004');
                expect(json).to.have.property('max', 35.5);
                expect(json).to.have.property('min', 0);
                expect(json).to.have.property('value', undefined);
                expect(json).to.have.property('unit', 'L');
                expect(json).to.have.property('type', 'number');
                expect(json).to.have.property('readonly', true);

                da1.communication.V.value = 12.3;

                json = da1.toJson();
                expect(json).to.have.property('name', 'Test_AnaView.L004');
                expect(json).to.have.property('max', 35.5);
                expect(json).to.have.property('min', 0);
                expect(json).to.have.property('value', 12.3);
                expect(json).to.have.property('unit', 'L');
                expect(json).to.have.property('type', 'number');
                expect(json).to.have.property('readonly', true);
            }

            expect(da2 instanceof AnaView).to.equals(true);
            if (da2 instanceof AnaView) {
                expect(da2.communication.VSclMin).to.have.property('value', 0);
                expect(da2.communication.VSclMax).to.have.property('value', 30);
                expect(da2.communication.V).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.Application.Sensoren.L001.V');
                expect(da2.communication.VUnit).to.have.property('value', 1038);
                expect(da2.getUnit()).to.equal('L');
            }
        });

        it('should create AnaServParam', async () => {
            const moduleJsonDosierer =
                JSON.parse(fs.readFileSync('assets/modules/module_dosierer_1.1.0.json').toString()).modules[0];
            const daJson = moduleJsonDosierer.services[0].strategies[1].parameters[0];
            const da = DataAssemblyFactory.create(daJson as any, new OpcUaConnection(null, null));

            expect(da instanceof ExtAnaOp).to.equal(true);
            expect(da instanceof ExtIntAnaOp).to.equal(true);
            expect(da instanceof AdvAnaOp).to.equal(false);
            expect(da instanceof AnaServParam).to.equal(true);

            if (da instanceof AnaServParam) {
                expect(da.communication.VOut).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VOut');
                expect(da.communication.VInt).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VInt');
                expect(da.communication.VMin).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VMin');
                expect(da.communication.VMax).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VMax');
                expect(da.WQC).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.WQC');
                expect(da.communication.OpMode).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.OpMode.binary');
                expect(da.communication.VExt).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VExt');
                expect(da.communication.VSclMax).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VSclMax');
                expect(da.communication.VSclMin).to.have.property('nodeId',
                    '|var|WAGO 750-8202 PFC200 2ETH RS.App_Dosing.Services.Fill.SetVolume.VSclMin');
            }
        });

        it('should create BinView', async () => {
            const da1 = DataAssemblyFactory.create({
                name: 'binview1',
                interface_class: 'BinView',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: {},
                    WQC: null,
                    V: {value: 22},
                    VState0: {value: 'on'},
                    VState1: {value: 'off'}
                } as any
            }, new OpcUaConnection(null, null));
            expect(da1 instanceof BinView).to.equal(true);
            expect(da1.toJson()).to.deep.equal({
                name: 'binview1',
                readonly: true,
                timestamp: undefined,
                type: 'boolean',
                value: true
            });

            const da2 = DataAssemblyFactory.create({
                name: 'binview2',
                interface_class: 'BinView',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: {},
                    WQC: null,
                    V: {value: 0},
                    VState0: {value: 'on'},
                    VState1: {value: 'off'}
                } as any
            }, new OpcUaConnection(null, null));
            expect(da2.toJson().value).to.equal(false);
        });

        it('should create BinMon', async () => {
            const da1 = DataAssemblyFactory.create({
                name: 'binmon1',
                interface_class: 'BinMon',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: {},
                    WQC: null,
                    V: {value: true},
                    VState0: {value: 'on'},
                    VState1: {value: 'off'},
                    VFlutEn: null
                } as any
            }, new OpcUaConnection(null, null));
            expect(da1 instanceof BinMon).to.equal(true);
            expect(da1.toJson()).to.deep.equal({
                name: 'binmon1',
                readonly: true,
                timestamp: undefined,
                type: 'boolean',
                value: true
            });
        });

        it('should create DigMon', async () => {
            const da1 = DataAssemblyFactory.create({
                name: 'digmon1',
                interface_class: 'DigMon',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: null,
                    WQC: null,
                    V: {value: 23},
                    VUnit: {value: 1038},
                    VSclMax: {value: 100},
                    VSclMin: {value: 0}
                } as any
            }, new OpcUaConnection(null, null));
            expect(da1 instanceof DigMon).to.equal(true);
            expect(da1.toJson()).to.deep.equal({
                name: 'digmon1',
                readonly: true,
                timestamp: undefined,
                type: 'number',
                unit: 'L',
                value: 23,
                max: 100,
                min: 0
            });
        });

        it('should create ExtIntDigOp', async () => {
            const da1 = DataAssemblyFactory.create({
                name: 'extintdigop1',
                interface_class: 'ExtIntDigOp',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: null,
                    WQC: null,
                    VRbk: {value: 23},
                    VUnit: {value: 1038},
                    VSclMax: {value: 100},
                    VSclMin: {value: 0}
                } as any
            }, new OpcUaConnection(null, null));
            expect(da1 instanceof ExtIntDigOp).to.equal(true);
            expect(da1.toJson()).to.deep.equal({
                name: 'extintdigop1',
                readonly: false,
                requestedValue: undefined,
                timestamp: undefined,
                type: 'number',
                unit: 'L',
                value: 23,
                max: 100,
                min: 0
            });
        });

        it('should create MonAnaDrv', async () => {
            const da1 = DataAssemblyFactory.create({
                name: 'MonAnaDrv1',
                interface_class: 'MonAnaDrv',
                communication: {
                    OSLevel: null,
                    TagDescription: null,
                    TagName: null,
                    WQC: null,
                    RpmFbk: {value: 50}
                }
            } as any, new OpcUaConnection(null, null));
            expect(da1 instanceof MonAnaDrv).to.equal(true);
            expect(da1.toJson()).to.deep.equal({
                name: 'MonAnaDrv1',
                readonly: false,
                requestedValue: undefined,
                timestamp: undefined,
                type: 'number',
                value: 50,
            });
        });
    });

    describe('with testserver', () => {

        let moduleServer: ModuleTestServer;
        let connection: OpcUaConnection;

        beforeEach(async () => {
            moduleServer = new ModuleTestServer();
            await moduleServer.start();

            connection = new OpcUaConnection('ModuleTestServer', 'opc.tcp://127.0.0.1:4334/ModuleTestServer');
            await connection.connect();
        });

        afterEach(async () => {
            await connection.disconnect();
            await moduleServer.shutdown();
        });

        it('should subscribe and unsubscribe from ExtIntAnaOp', async () => {
            const daJson = JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json').toString())
                .modules[0].services[0].strategies[0].parameters[0];
            const da = DataAssemblyFactory.create(daJson as any, connection) as ExtIntAnaOp;

            await da.subscribe();

            da.setParameter(2);
            await new Promise((resolve) => da.on('changed', () => {
                if (da.writeDataItem.value === 2) {
                    resolve();
                }
            }));
            expect(da.writeDataItem.value).to.equal(2);

            await da.setParameter(3, 'VExt');
            await new Promise((resolve) => da.on('changed', () => {
                if (da.writeDataItem.value === 3) {
                    resolve();
                }
            }));

            da.unsubscribe();
            da.setParameter(2);
            await Promise.race([
                new Promise((resolve, reject) => da.on('changed', reject)),
                new Promise((resolve) => setTimeout(resolve, 500))
            ]);
        }).timeout(5000);

        it('should set value', async () => {
            const daJson = JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json').toString())
                .modules[0].services[0].strategies[0].parameters[0];
            const da = DataAssemblyFactory.create(daJson as any, connection) as ExtIntAnaOp;

            await da.subscribe();

            await da.setValue({value: 11, name: 'abc'}, []);
            await new Promise((resolve) => da.on('changed', () => {
                if (da.writeDataItem.value === 11) {
                    resolve();
                }
            }));
            expect(da.writeDataItem.value).to.equal(11);

            await da.setValue({value: 12, name: 'abc'}, []);
            await new Promise((resolve) => da.on('changed', () => {
                if (da.writeDataItem.value === 12) {
                    resolve();
                }
            }));
            expect(da.writeDataItem.value).to.equal(12);
        }).timeout(5000);

        it('should set continuous value', async () => {
            const daModule = JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json').toString())
                .modules[0];
            const module = new Module(daModule);
            await module.connect();
            moduleServer.startSimulation();

            const da = module.services[0].strategies[0].parameters[0] as WritableDataAssembly;
            const inputDa = module.variables[0];
            await da.subscribe();
            await inputDa.subscribe();

            await new Promise((resolve) => inputDa.on('changed', () => resolve()));

            da.setValue({value: '2 * ModuleTestServer.Variable001', name: da.name, continuous: true}, [module]);
            const inputValue = inputDa.getValue();
            await new Promise((resolve) => da.on('changed', () => resolve()));
            expect(da.getValue()).to.be.closeTo(2 * inputValue, 0.05 * inputValue);

            await da.setValue({value: '11', name: da.name}, []);
            await new Promise((resolve) => da.on('changed', () => resolve()));
            expect(da.getValue()).to.equal(11);
        }).timeout(5000);

        it('should create ServiceControl old', async () => {
            const daJson = JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json').toString())
                .modules[0].services[0];
            const da: ServiceControl = DataAssemblyFactory.create(
                {...daJson, interface_class: 'ServiceControl'} as any, connection) as ServiceControl;
            expect(da.classicOpMode).to.equal(true);

            await da.subscribe();
            expect(da.name).to.equal('Service1');
            expect(da instanceof ServiceControl).to.equal(true);

            expect(da.getOperationMode()).to.equal(OperationMode.Offline);

            await da.setToManualOperationMode();
            expect(da.getOperationMode()).to.equal(OperationMode.Operator);

            await da.writeOpMode(OperationMode.Offline);
            await da.waitForOpModeToPassSpecificTest(OperationMode.Offline);

            await da.setToAutomaticOperationMode();
            expect(da.getOperationMode()).to.equal(OperationMode.Automatic);
        }).timeout(8000);

        it('should create ServiceControl new', async () => {
            const daJson = JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0_2.json').toString())
                .modules[0].services[0];
            const da: ServiceControl = DataAssemblyFactory.create(
                {...daJson, interface_class: 'ServiceControl'} as any, connection) as ServiceControl;
            expect(da.classicOpMode).to.equal(false);

            await da.subscribe();
            expect(da.name).to.equal('Service1');
            expect(da instanceof ServiceControl).to.equal(true);

            expect(da.getOperationMode()).to.equal(OperationMode.Offline);

            await da.setToManualOperationMode();
            expect(da.getOperationMode()).to.equal(OperationMode.Operator);

            await da.writeOpMode(OperationMode.Offline);
            await da.waitForOpModeToPassSpecificTest(OperationMode.Offline);

            await da.setToAutomaticOperationMode();
            expect(da.getOperationMode()).to.equal(OperationMode.Automatic);
        }).timeout(8000);

        it('should create ExtIntAnaOp', async () => {
            const daJson = JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json').toString())
                .modules[0].services[0].strategies[0].parameters[0];
            const da = DataAssemblyFactory.create(daJson as any, connection) as ExtIntAnaOp;

            await da.subscribe();
            expect(da.name).to.equal('Factor');
            expect(da instanceof ExtAnaOp).to.equal(true);
            expect(da instanceof ExtIntAnaOp).to.equal(true);
            expect(da instanceof AdvAnaOp).to.equal(false);

            await da.waitForOpModeToPassSpecificTest(OperationMode.Offline);
            expect(da.getOperationMode()).to.equal(OperationMode.Offline);
            expect(da.getOperationMode()).to.equal('offline');

            expect(da.classicOpMode).to.equal(true);
            await da.writeOpMode(OperationMode.Operator);
            await da.waitForOpModeToPassSpecificTest(OperationMode.Operator);
            expect(da.getOperationMode()).to.equal('operator');

            da.setToAutomaticOperationMode();
            await da.waitForOpModeToPassSpecificTest(OperationMode.Automatic);
            expect(da.getOperationMode()).to.equal('automatic');

            da.setToExternalSourceMode();
            await da.waitForSourceModeToPassSpecificTest(SourceMode.Manual);
            expect(da.getSourceMode()).to.equal(SourceMode.Manual);
            expect(da.getSourceMode()).to.equal('manual');

            if (da instanceof ExtIntAnaOp) {
                expect(da.communication.VOut).to.have.property('nodeId', 'Service1.Factor.V');
                expect(da.communication.VOut).to.have.property('value', 2);
                const json = da.toJson();
                expect(json).to.have.property('name', 'Factor');
                expect(json).to.have.property('readonly', false);
                expect(json).to.have.property('type', 'number');
                expect(json).to.have.property('value', 2);
                expect(json).to.have.property('min');
                expect(json).to.have.property('max');
                expect(json).to.have.property('unit');
            }

            await da.setToManualOperationMode();
            expect(da.getOperationMode()).to.equal(OperationMode.Operator);

            await da.setToAutomaticOperationMode();
            expect(da.getOperationMode()).to.equal(OperationMode.Automatic);
        }).timeout(8000);

        it('should create StrView', async () => {
            const daJson = {
                name: 'CurrentTime',
                interface_class: 'StrView',
                communication:
                    {
                        WQC:
                            {
                                namespace_index: 'urn:NodeOPCUA-Server-default',
                                node_id: 'Service1.CurrentTime.WQC',
                                data_type: 'Byte'
                            },
                        OSLevel:
                            {
                                namespace_index: 'urn:NodeOPCUA-Server-default',
                                node_id: 'Service1.CurrentTime.OSLevel',
                                data_type: 'Byte'
                            },
                        Text:
                            {
                                namespace_index: 'urn:NodeOPCUA-Server-default',
                                node_id: 'Service1.CurrentTime.Text',
                                data_type: 'String'
                            }
                    }
            };
            const da = DataAssemblyFactory.create(daJson as any, connection);

            expect(da instanceof ExtAnaOp).to.equal(false);
            expect(da instanceof ExtIntAnaOp).to.equal(false);
            expect(da instanceof AdvAnaOp).to.equal(false);

            expect(da instanceof StrView).to.equal(true);

            if (da instanceof StrView) {
                await da.subscribe();
                expect(da.OSLevel).to.have.property('dataType', 'UInt32');
                expect(da.OSLevel).to.have.property('namespaceIndex', 'urn:NodeOPCUA-Server-default');
                expect(da.OSLevel).to.have.property('nodeId', 'Service1.CurrentTime.OSLevel');

                expect(da.Text).to.have.property('nodeId', 'Service1.CurrentTime.Text');
                expect(da.Text).to.have.property('value', 'initial value');

                const json = da.toJson();
                expect(json).to.have.property('name', 'CurrentTime');
                expect(json).to.have.property('readonly', true);
                expect(json).to.have.property('type', 'string');
                expect(json).to.have.property('value', 'initial value');
            }
        });
    });

});
