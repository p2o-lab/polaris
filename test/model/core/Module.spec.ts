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

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import {Module} from '../../../src/model/core/Module';
import {StrView} from '../../../src/model/dataAssembly/indicatorElement/StrView';
import {ModuleTestServer} from '../../../src/moduleTestServer/ModuleTestServer';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Module', () => {

    it('should load the cif module json', () => {
        const f = fs.readFileSync('assets/modules/module_cif.json');
        const module = new Module(JSON.parse(f.toString()).modules[0]);
        expect(module).to.have.property('id', 'CIF');
        expect(module.services).to.have.length(6);
    });

    context('with module server', () => {
        let moduleServer: ModuleTestServer;

        before(async () => {
            moduleServer = new ModuleTestServer();
            await moduleServer.start();
            moduleServer.startSimulation();
        });

        after(async () => {
            moduleServer.stopSimulation();
            await moduleServer.shutdown();
        });

        it('should connect to module, provide correct json output and disconnect', async () => {
            const moduleJson =
                JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json', 'utf8')).modules[0];
            const module = new Module(moduleJson);
            await module.connect();

            const json = module.json();
            expect(json).to.have.property('id', 'ModuleTestServer');
            expect(json).to.have.property('endpoint', 'opc.tcp://127.0.0.1:4334/ModuleTestServer');
            expect(json).to.have.property('protected', false);
            expect(json).to.have.property('services')
                .to.have.lengthOf(2);

            expect(module.services[0].eventEmitter.listenerCount('state')).to.equal(1);
            expect(module.services[0].serviceControl.listenerCount('State')).to.equal(1);

            expect(module.variables[0].listenerCount('V')).to.equal(1);
            expect(module.variables[0].communication.WQC.listenerCount('changed')).to.equal(1);
            expect(module.variables[0].communication.WQC.listenerCount('changed')).to.equal(1);
            expect(module.services[0].eventEmitter.listenerCount('parameterChanged')).to.equal(1);

            const errorMsg = module.services[0].strategies[0].processValuesOut[0] as StrView;
            expect(errorMsg.communication.WQC.listenerCount('changed')).to.equal(1);
            expect(errorMsg.communication.Text.listenerCount('changed')).to.equal(1);

            await Promise.all([
                new Promise((resolve) => module.on('parameterChanged', resolve)),
                new Promise((resolve) => module.on('variableChanged', resolve)),
                new Promise((resolve) => module.on('stateChanged', resolve))
            ]);
            await module.disconnect();
        }).timeout(3000);

        it('should work after reconnect', async () => {
            const moduleJson =
                JSON.parse(fs.readFileSync('assets/modules/module_testserver_1.0.0.json', 'utf8')).modules[0];
            const module = new Module(moduleJson);

            await module.connect();
            expect(module.connection.monitoredItemSize()).to.be.greaterThan(80);

            await Promise.all([
                new Promise((resolve) => module.on('parameterChanged', resolve)),
                new Promise((resolve) => module.on('variableChanged', resolve)),
                new Promise((resolve) => module.on('stateChanged', resolve))
            ]);
            await module.disconnect();
            expect(module.connection.monitoredItemSize()).to.equal(0);

            await module.connect();
            expect(module.connection.monitoredItemSize()).to.be.greaterThan(80);
            await Promise.all([
                new Promise((resolve) => module.on('parameterChanged', resolve)),
                new Promise((resolve) => module.on('variableChanged', resolve)),
                new Promise((resolve) => module.on('stateChanged', resolve))
            ]);
        }).timeout(5000);

    });

});
