/*
 * MIT License
 *
 * Copyright (c) 2018 Markus Graube <markus.graube@tu.dresden.de>,
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

import {Request, Response, Router} from 'express';
import {Manager} from '../../model/Manager';

import * as asyncHandler from 'express-async-handler';
import {constants} from 'http2';
import {catModule, catServer} from '../../logging/logging';

export const moduleRouter: Router = Router();

/**
 * @api {get} /module/    Get all modules
 * @apiName GetModules
 * @apiGroup Module
 */
moduleRouter.get('', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    res.json(await manager.getModules());
}));

/**
 * @api {get} /module/:id    Get module
 * @apiName GetModule
 * @apiGroup Module
 * @apiParam {string} id    Module id
 */
moduleRouter.get('/:id', (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    try {
        res.json(manager.getModule(req.params.id).json());
    } catch (err) {
        res.status(constants.HTTP_STATUS_NOT_FOUND).send(err.toString());
    }
});

/**
 * @api {get} /module/:id/download    Download module options
 * @apiName GetModuleDownload
 * @apiGroup Module
 * @apiParam {string} id    Module id
 */
moduleRouter.get('/:id/download', (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    res.json(manager.getModule(req.params.id).options);
});

/**
 * @api {put} /module    Add module
 * @apiName PutModule
 * @apiGroup Module
 * @apiParam {ModuleOptions} module    Module to be added
 */
moduleRouter.put('', (req, res) => {
    catServer.info(`Load module`);
    const manager: Manager = req.app.get('manager');
    const newModules = manager.loadModule(req.body);
    newModules.forEach((module) =>
        module.connect()
            .catch(() => catModule.warn(`Could not connect to module ${module.id}`))
    );
    res.json(newModules.map((module) => module.json()));
});

/**
 * @api {put} /viaPiMAd Add module via PiMAd.
 * @apiName PutModule
 * @apiGroup Module
 * @apiParam {ModuleOptions} module Module to be added.
 */
moduleRouter.put('/viaPiMAd', (req, res) => {
    catServer.info(`Load module via PiMAd`);
    res.status(200).send('PiMAd-Hello-World\n');
});

/**
 * @api {delete} /module/:id    Delete module
 * @apiName DeleteModule
 * @apiGroup Module
 * @apiParam {string} id    Module id to be deleted
 */
moduleRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    try {
        await manager.removeModule(req.params.id);
        res.send({ status: 'Successful deleted', id: req.params.id });
    } catch (err) {
        res.status(404).send(err.toString());
    }
}));

/**
 * @api {post} /module/:id/connect    Connect module
 * @apiName ConnectModule
 * @apiGroup Module
 * @apiParam {string} id    Module id
 */
moduleRouter.post('/:id/connect', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    const module = manager.getModule(req.params.id);
    await module.connect();
    res.json({ module: module.id, status: 'Succesfully connected' });
}));

/**
 * @api {post} /module/:id/disconnect    Disconnect module
 * @apiName DisconnectModule
 * @apiGroup Module
 * @apiParam {string} id    Module id
 */
moduleRouter.post('/:id/disconnect', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    const module = manager.getModule(req.params.id);
    await module.disconnect();
    res.json({ module: module.id, status: 'Succesfully disconnected' });
}));

/**
 * @api {post} /module/abort    Abort all services
 * @apiName AbortAllServices
 * @apiDescription Abort all services from all modules
 * @apiGroup Module
 */
moduleRouter.post('/abort', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    await manager.abortAllServices();
    res.json({ status: 'aborted all services from all modules' });
}));

/**
 * @api {post} /module/stop    Stop all services
 * @apiName StopAllServices
 * @apiDescription Abort all services from all modules
 * @apiGroup Module
 */
moduleRouter.post('/stop', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    await manager.stopAllServices();
    res.json({ status: 'stopped all services from all modules' });
}));

/**
 * @api {post} /module/reset    Reset all services
 * @apiName ResetAllServices
 * @apiDescription Reset all services from all modules
 * @apiGroup Module
 */
moduleRouter.post('/reset', asyncHandler(async (req: Request, res: Response) => {
    const manager: Manager = req.app.get('manager');
    await manager.resetAllServices();
    res.json({ status: 'reset all services from all modules' });
}));
