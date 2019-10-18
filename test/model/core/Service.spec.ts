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

import {ServiceCommand} from '@p2olab/polaris-interface';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as fs from 'fs';
import * as parseJson from 'json-parse-better-errors';
import {
    isAutomaticState, isExtSource, isOffState, OperationMode,
    ServiceState
} from '../../../src/model/core/enum';
import {Module} from '../../../src/model/core/Module';
import {Service} from '../../../src/model/core/Service';
import {ModuleTestServer} from '../../../src/moduleTestServer/ModuleTestServer';
import {TestServerService} from '../../../src/moduleTestServer/ModuleTestService';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Service', () => {

    context('constructor', () => {
        it('should fail with missing options', () => {
            expect(() => new Service(null, null, null)).to.throw();
        });

        it('should fail with missing name', () => {
            expect(() => new Service(
                {name: null, parameters: null, communication: null, strategies: null}, null, null)
            ).to.throw('No service name');
        });

        it('should fail with missing module', () => {
            expect(() => new Service(
                {name: 'test', parameters: null, communication: null, strategies: null}, null, null)
            ).to.throw('No module');
        });

    });

    it('should reject command if not connected', async () => {
        const moduleJson =
            parseJson(fs.readFileSync('assets/modules/module_testserver_1.0.0.json', 'utf8'), null, 60)
                .modules[0];
        const module = new Module(moduleJson);
        const service = module.services[0];
        await expect(service.executeCommand(ServiceCommand.start)).to.be.rejectedWith('Module is not connected');
    });

    context('with ModuleTestServer', () => {
        let module: Module;
        let service: Service;

        before(() => {
            const moduleJson =
                parseJson(fs.readFileSync('assets/modules/module_testserver_1.0.0.json', 'utf8'), null, 60)
                    .modules[0];
            module = new Module(moduleJson);
            service = module.services[0];
        });

        it('should get default strategy', () => {
            const strategy = service.getDefaultStrategy();
            expect(strategy.name).to.equal('Strategy 1');
        });

        it('should find strategy', () => {
            const strategy = service.getStrategyByNameOrDefault('Strategy 1');
            expect(strategy.name).to.equal('Strategy 1');
        });

        it('should find strategy 2', () => {
            const strategy = service.getStrategyByNameOrDefault('StrategyNotThere');
            expect(strategy).to.equal(undefined);
        });

        it('should get undefined when getting current strategy when not connected', () => {
            expect(service.getCurrentStrategy()).to.equal(undefined);
        });
    });

    context('dynamic test', () => {
        let moduleServer: ModuleTestServer;
        let service: Service;
        let testService: TestServerService;
        let module: Module;

        beforeEach(async function() {
            this.timeout(5000);
            moduleServer = new ModuleTestServer();
            await moduleServer.start();
            moduleServer.startSimulation();
            testService = moduleServer.services[0];

            const moduleJson =
                parseJson(fs.readFileSync('assets/modules/module_testserver_1.0.0.json', 'utf8'), null, 60)
                    .modules[0];
            module = new Module(moduleJson);
            service = module.services[0];
            await module.connect();
        });

        afterEach(async () => {
            await module.disconnect();
            moduleServer.stopSimulation();
            await moduleServer.shutdown();
        });

        it('should get default strategy for default strategy', () => {
            expect(service.getCurrentStrategy()).to.equal(service.getDefaultStrategy());
        });

        it('should find parameter', () => {
            const param = service.findInputParameter('Offset');
            expect(param.name).to.equal('Offset');
        });

        it('should provide correct JSON', () => {
            expect(ServiceState[service.state]).to.equal('IDLE');
            const result = service.getOverview();
            expect(result).to.have.property('status', 'IDLE');
        });

        it('should reject command if not command enabled', async () => {
            expect(service.name).to.equal('Service1');
            expect(ServiceState[service.state]).to.equal('IDLE');
            expect(service.controlEnable).to.deep.equal({
                abort: true,
                complete: false,
                pause: false,
                reset: false,
                restart: false,
                resume: false,
                start: true,
                stop: true,
                unhold: false
            });

            await service.executeCommand(ServiceCommand.start);
            await service.waitForStateChangeWithTimeout('STARTING');
            expect(service.controlEnable).to.deep.equal({
                abort: true,
                complete: false,
                pause: false,
                reset: false,
                restart: false,
                resume: false,
                start: false,
                stop: true,
                unhold: false
            });

            await expect(service.executeCommand(ServiceCommand.resume)).to.be.rejectedWith('ControlOp');
            expect(service.controlEnable).to.deep.equal({
                abort: true,
                complete: false,
                pause: false,
                reset: false,
                restart: false,
                resume: false,
                start: false,
                stop: true,
                unhold: false
            });
        });

        it('full service state cycle', async () => {
            let result = service.getOverview();
            expect(result).to.have.property('status', 'IDLE');
            expect(result).to.have.property('controlEnable')
                .to.deep.equal({
                abort: true,
                complete: false,
                pause: false,
                reset: false,
                restart: false,
                resume: false,
                start: true,
                stop: true,
                unhold: false
            });

            expect(result).to.have.property('currentStrategy', 'Strategy 1');
            expect(result).to.have.property('name', 'Service1');
            expect(result).to.have.property('opMode').to.deep.equal({
                state: 'off',
                source: undefined
            });

            await service.setOperationMode();

            result = service.getOverview();
            expect(result).to.have.property('status', 'IDLE');
            expect(result).to.have.property('controlEnable')
                .to.deep.equal({
                abort: true,
                complete: false,
                pause: false,
                reset: false,
                restart: false,
                resume: false,
                start: true,
                stop: true,
                unhold: false
            });

            expect(result).to.have.property('currentStrategy', 'Strategy 1');
            expect(result).to.have.property('name', 'Service1');
            expect(result).to.have.property('opMode').to.deep.equal({
                state: 'automatic',
                source: 'external'
            });
            expect(result.strategies[0].processValuesIn).to.have.length(1);
            expect(result.strategies[0].processValuesIn[0].value).to.equal(1);
            expect(result.strategies[0].processValuesOut).to.have.length(3);
            expect(result.strategies[0].reportParameters).to.have.length(3);

            let stateChangeCount = 0;
            service.eventEmitter.on('state', () => {
                stateChangeCount++;
            });

            service.executeCommand(ServiceCommand.start);
            await service.waitForStateChangeWithTimeout('STARTING');
            await service.waitForStateChangeWithTimeout('EXECUTE');

            service.executeCommand(ServiceCommand.restart);
            await service.waitForStateChangeWithTimeout('STARTING');
            await service.waitForStateChangeWithTimeout('EXECUTE');

            service.executeCommand(ServiceCommand.stop);
            await service.waitForStateChangeWithTimeout('STOPPING');
            await service.waitForStateChangeWithTimeout('STOPPED');

            service.executeCommand(ServiceCommand.reset);
            await service.waitForStateChangeWithTimeout('IDLE');

            service.executeCommand(ServiceCommand.start);
            await service.waitForStateChangeWithTimeout('STARTING');
            await service.waitForStateChangeWithTimeout('EXECUTE');

            service.executeCommand(ServiceCommand.pause);
            await service.waitForStateChangeWithTimeout('PAUSING');
            await service.waitForStateChangeWithTimeout('PAUSED');

            service.executeCommand(ServiceCommand.resume);
            await service.waitForStateChangeWithTimeout('RESUMING');
            await service.waitForStateChangeWithTimeout('EXECUTE');

            service.executeCommand(ServiceCommand.complete);
            await service.waitForStateChangeWithTimeout('COMPLETING');
            await service.waitForStateChangeWithTimeout('COMPLETED');

            service.executeCommand(ServiceCommand.abort);
            await service.waitForStateChangeWithTimeout('ABORTING');
            await service.waitForStateChangeWithTimeout('ABORTED');

            service.executeCommand(ServiceCommand.reset);
            await service.waitForStateChangeWithTimeout('IDLE');

            service.executeCommand(ServiceCommand.start);
            await service.waitForStateChangeWithTimeout('STARTING');
            await service.waitForStateChangeWithTimeout('EXECUTE');

            service.executeCommand(ServiceCommand.complete);
            await service.waitForStateChangeWithTimeout('COMPLETING');
            await service.waitForStateChangeWithTimeout('COMPLETED');

            expect(stateChangeCount).to.equal(22);
        }).timeout(6000).slow(4000);
    });
});
