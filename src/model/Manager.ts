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

import {
    BackendNotification, ModuleInterface, ModuleOptions,
    RecipeOptions,
    ServiceCommand, VariableChange,
    VirtualServiceInterface
} from '@p2olab/polaris-interface';
import {EventEmitter} from 'events';
import {PEAPool, PEAPoolVendor} from 'PiMAd-core';
import StrictEventEmitter from 'strict-event-emitter-types';
import {ServiceLogEntry} from '../logging/archive';
import {catManager} from '../logging/logging';
import {ServiceState} from './core/enum';
import {Module, ParameterChange} from './core/Module';
import {Service} from './core/Service';
import {Player} from './recipe/Player';
import {Recipe} from './recipe/Recipe';
import {VirtualService} from './virtualService/VirtualService';
import {VirtualServiceFactory, VirtualServiceOptions} from './virtualService/VirtualServiceFactory';

interface ManagerEvents {
    /**
     * when one service goes to *completed*
     * @event recipeFinished
     */
    recipeFinished: void;

    notify: BackendNotification;
}

type ManagerEmitter = StrictEventEmitter<EventEmitter, ManagerEvents>;

export interface LoadModuleOptions {
    module?: ModuleOptions;
    modules?: ModuleOptions[];
    subplants?: Array<{ modules: ModuleOptions[] }>;
}

export class Manager extends (EventEmitter as new() => ManagerEmitter) {

    get autoreset(): boolean {
        return this._autoreset;
    }

    set autoreset(value: boolean) {
        catManager.info(`Set AutoReset to ${value}`);
        this._autoreset = value;
    }

    // loaded recipes
    public readonly recipes: Recipe[] = [];

    // loaded modules
    public readonly modules: Module[] = [];

    // instantiated virtual services
    public readonly virtualServices: VirtualService[] = [];

    public readonly player: Player;

    public variableArchive: VariableChange[] = [];

    public serviceArchive: ServiceLogEntry[] = [];

    // autoreset determines if a service is automatically reset when
    private _autoreset: boolean = true;
    // autoreset timeout in milliseconds
    private _autoresetTimeout: number = 500;
    // PiMAd-core
    private peaPool: PEAPool;

    constructor() {
        super();
        this.peaPool = new PEAPoolVendor().buyDependencyPEAPool();
        this.player = new Player()
            .on('started', () => {
                this.emit('notify', { message: 'player', player: this.player.json()});
            })
            .on('recipeChanged', () => {
                this.emit('notify', { message: 'player', player: this.player.json()});
            })
            .on('recipeFinished', () => {
                this.emit('notify', { message: 'player', player: this.player.json()});
            })
            .on('completed', () => {
                this.emit('notify', { message: 'player', player: this.player.json()});
            });
    }

    public getModule(moduleId: string): Module {
        const module = this.modules.find((mod) => mod.id === moduleId);
        if (module) {
            return module;
        } else {
            throw Error(`Module with id ${moduleId} not found`);
        }
    }

    /**
     * Load modules from JSON according to TopologyGenerator output or to simplified JSON
     * Skip module if already a module with same id is registered
     * @param options           options for creating modules
     * @param {boolean} protectedModules  should modules be protected from being deleted
     * @returns {Module[]}  created modules
     */
    public loadModule(options: LoadModuleOptions, protectedModules: boolean = false): Module[] {
        const newModules: Module[] = [];
        if (!options) {
            throw new Error('No modules defined in supplied options');
        }
        if (options.subplants) {
            options.subplants.forEach((subplantOptions) => {
                subplantOptions.modules.forEach((moduleOptions: ModuleOptions) => {
                    if (this.modules.find((mod) => (mod).id === moduleOptions.id)) {
                        catManager.warn(`Module ${moduleOptions.id} already in registered modules`);
                        throw new Error(`Module ${moduleOptions.id} already in registered modules`);
                    } else {
                        newModules.push(new Module(moduleOptions, protectedModules));
                    }
                });
            });
        } else if (options.modules) {
            options.modules.forEach((moduleOptions: ModuleOptions) => {
                if (this.modules.find((mod) => (mod).id === moduleOptions.id)) {
                    catManager.warn(`Module ${moduleOptions.id} already in registered modules`);
                    throw new Error(`Module ${moduleOptions.id} already in registered modules`);
                } else {
                    newModules.push(new Module(moduleOptions, protectedModules));
                }
            });
        } else if (options.module) {
            const moduleOptions = options.module;
            if (this.modules.find((mod) => (mod).id === moduleOptions.id)) {
                catManager.warn(`Module ${moduleOptions.id} already in registered modules`);
                throw new Error(`Module ${moduleOptions.id} already in registered modules`);
            } else {
                newModules.push(new Module(moduleOptions, protectedModules));
            }
        } else {
            throw new Error('No modules defined in supplied options');
        }
        this.modules.push(...newModules);
        newModules.forEach((module: Module) => {
            module
                .on('connected', () => {
                    this.emit('notify', { message: 'module', module: module.json()});
                })
                .on('disconnected', () => {
                    catManager.info('Module disconnected');
                    this.emit('notify', { message: 'module', module: module.json()});
                })
                .on('controlEnable', ({service}) => {
                    this.emit('notify', {message: 'service', moduleId: module.id, service: service.json()});
                })
                .on('variableChanged', (variableChange: VariableChange) => {
                    this.variableArchive.push(variableChange);
                    if (this.player.currentRecipeRun) {
                        this.player.currentRecipeRun.variableLog.push(variableChange);
                    }
                    this.emit('notify', {message: 'variable', variable: variableChange});
                })
                .on('parameterChanged', (parameterChange: ParameterChange) => {
                    this.emit('notify', {
                        message: 'service',
                        moduleId: module.id,
                        service: parameterChange.service.json()
                    });
                })
                .on('commandExecuted', (data) => {
                    const logEntry: ServiceLogEntry = {
                        timestampPfe: new Date(),
                        module: module.id,
                        service: data.service.name,
                        strategy: data.strategy.name,
                        command: ServiceCommand[data.command],
                        parameter: data.parameter ? data.parameter.map((param) => {
                            return {name: param.name, value: param.value};
                        }) : undefined
                    };
                    this.serviceArchive.push(logEntry);
                    if (this.player.currentRecipeRun) {
                        this.player.currentRecipeRun.serviceLog.push(logEntry);
                    }
                })
                .on('stateChanged', ({service, state}) => {
                    const logEntry: ServiceLogEntry = {
                        timestampPfe: new Date(),
                        module: module.id,
                        service: service.name,
                        state: ServiceState[state]
                    };
                    this.serviceArchive.push(logEntry);
                    if (this.player.currentRecipeRun) {
                        this.player.currentRecipeRun.serviceLog.push(logEntry);
                    }
                    this.emit('notify', {message: 'service', moduleId: module.id, service: service.json()});
                })
                .on('opModeChanged', ({service}) => {
                    this.emit('notify', {message: 'service', moduleId: module.id, service: service.json()});
                })
                .on('serviceCompleted', (service: Service) => {
                    this.performAutoReset(service);
                });
            this.emit('notify', {message: 'module', module: module.json()});
        });
        return newModules;
    }

    public async removeModule(moduleId) {
        catManager.info(`Remove module ${moduleId}`);
        const module = this.getModule(moduleId);
        if (module.protected) {
            throw new Error(`Module ${moduleId} is protected and can't be deleted`);
        }

        catManager.debug(`Disconnecting module ${moduleId} ...`);
        await module.disconnect()
            .catch((err) => catManager.warn('Something wrong while disconnecting from module: ' + err.toString()));

        catManager.debug(`Deleting module ${moduleId} ...`);
        const index = this.modules.indexOf(module, 0);
        if (index > -1) {
            this.modules.splice(index, 1);
        }
    }

    public getModules(): ModuleInterface[] {
        return this.modules.map((module) => module.json());
    }

    public getVirtualServices(): VirtualServiceInterface[] {
        return this.virtualServices.map((vs) => vs.json());
    }

    public loadRecipe(options: RecipeOptions, protectedRecipe: boolean = false): Recipe {
        const newRecipe = new Recipe(options, this.modules, protectedRecipe);
        this.recipes.push(newRecipe);
        this.emit('notify', {message: 'recipes', recipes: this.recipes.map((r) => r.json())});
        return newRecipe;
    }

    /**
     * Abort all services from all loaded modules
     */
    public abortAllServices() {
        const tasks = [];
        tasks.push(this.modules.map((module) => module.abort()));
        return Promise.all(tasks);
    }

    /**
     * Stop all services from all loaded modules
     */
    public stopAllServices() {
        const tasks = [];
        tasks.push(this.modules.map((module) => module.stop()));
        return Promise.all(tasks);
    }

    /**
     * Reset all services from all loaded modules
     */
    public resetAllServices() {
        const tasks = [];
        tasks.push(this.modules.map((module) => module.reset()));
        return Promise.all(tasks);
    }

    public removeRecipe(recipeId: string) {
        catManager.debug(`Remove recipe ${recipeId}`);
        const recipe = this.recipes.find((rec) => rec.id === recipeId);
        if (!recipe) {
            throw new Error(`Recipe ${recipeId} not available.`);
        }
        if (recipe.protected) {
            throw new Error(`Recipe ${recipeId} can not be deleted since it is protected.`);
        } else {
            const index = this.recipes.indexOf(recipe, 0);
            if (index > -1) {
                this.recipes.splice(index, 1);
            }
        }
    }

    /**
     * find [Service] of a [Module] registered in manager
     * @param {string} moduleName
     * @param {string} serviceName
     * @returns {Service}
     */
    public getService(moduleName: string, serviceName: string): Service {
        const module: Module = this.modules.find((mod) => mod.id === moduleName);
        if (!module) {
            throw new Error(`Module with id ${moduleName} not registered`);
        }
        return module.getService(serviceName);
    }

    public instantiateVirtualService(options: VirtualServiceOptions) {
        const virtualService = VirtualServiceFactory.create(options, this.modules);
        catManager.info(`instantiated virtual Service ${virtualService.name}`);
        virtualService.eventEmitter
            .on('controlEnable', () => {
                this.emit('notify', {message: 'virtualService', virtualService: virtualService.json()});
            })
            .on('parameterChanged', () => {
                this.emit('notify', {message: 'virtualService', virtualService: virtualService.json()});
            })
            .on('commandExecuted', (data) => {
                const logEntry: ServiceLogEntry = {
                    timestampPfe: new Date(),
                    module: 'virtualServices',
                    service: virtualService.name,
                    strategy: null,
                    command: ServiceCommand[data.command],
                    parameter: data.parameter ? data.parameter.map((param) => {
                        return {name: param.name, value: param.value};
                    }) : undefined
                };
                this.serviceArchive.push(logEntry);
                if (this.player.currentRecipeRun) {
                    this.player.currentRecipeRun.serviceLog.push(logEntry);
                }
            })
            .on('state', (state) => {
                const logEntry: ServiceLogEntry = {
                    timestampPfe: new Date(),
                    module: 'virtualServices',
                    service: virtualService.name,
                    state: ServiceState[state]
                };
                this.serviceArchive.push(logEntry);
                if (this.player.currentRecipeRun) {
                    this.player.currentRecipeRun.serviceLog.push(logEntry);
                }
                this.emit('notify', {message: 'virtualService', virtualService: virtualService.json()});
            });
        this.emit('notify', {message: 'virtualService', virtualService: virtualService.json()});
        this.virtualServices.push(virtualService);
    }

    public removeVirtualService(virtualServiceId: string) {
        catManager.debug(`Remove Virtual Service ${virtualServiceId}`);
        const index = this.virtualServices.findIndex((virtualService) => virtualService.name === virtualServiceId);
        if (index === -1) {
            throw new Error(`Virtual Service ${virtualServiceId} not available.`);
        }
        if (index > -1) {
            this.virtualServices.splice(index, 1);
        }
    }

    /**
     * Perform autoreset for service (bring it automatically from completed to idle)
     * @param {Service} service
     */
    private performAutoReset(service: Service) {
        if (this.autoreset) {
            catManager.info(`Service ${service.connection.id}.${service.name} completed. ` +
                `Short waiting time (${this._autoresetTimeout}) to autoreset`);
            setTimeout(async () => {
                if (service.connection.isConnected() && service.state === ServiceState.COMPLETED) {
                    catManager.info(`Service ${service.connection.id}.${service.name} completed. ` +
                        `Now perform autoreset`);
                    try {
                        service.executeCommand(ServiceCommand.reset);
                    } catch (err) {
                        catManager.debug('Autoreset not possible');
                    }
                }
            }, this._autoresetTimeout);
        }
    }
}
