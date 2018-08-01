import * as express from 'express';
import {recipe_manager} from '../model/RecipeManager';
import {catServer} from '../config/logging';

export const moduleRouter = express.Router();

/**
 * @api {get} /module/    Get modules
 * @apiName GetModules
 * @apiGroup Module
 */
moduleRouter.get('', async (req: express.Request, res: express.Response) => {
    catServer.info('GET /module/');
    const tasks = recipe_manager.modules.map(module => module.json());
    res.json(await Promise.all(tasks));
});

/**
 * @api {get} /module/:id    Get module
 * @apiName GetModule
 * @apiGroup Module
 * @apiParam {string} id    Module id
 */
moduleRouter.get('/:id', async (req: express.Request, res: express.Response) => {
    catServer.info(`GET /module/${req.params.id}`);
    res.json(await recipe_manager.modules.find(module => module.id === req.params.id).json());
});


/**
 * @api {post} /module    Add modules
 * @apiName PostModule
 * @apiGroup Module
 * @apiParam {object} modules    Modules to be added
 */
moduleRouter.post('', async (req: express.Request, res: express.Response) => {
    catServer.info(`POST /module/ - ${JSON.stringify(req.body)}`);
    const newModules = recipe_manager.loadModule(req.body);
    res.json(await Promise.all(newModules.map(module => module.json())));
});

/**
 * @api {delete} /module/:id    Delete module
 * @apiName DeleteModule
 * @apiGroup Module
 * @apiParam {string} id    Module id to be deleted
 */
moduleRouter.delete('/:id', async (req: express.Request, res: express.Response) => {
    catServer.info(`Delete /module/${req.params.id}`);
    const module = recipe_manager.modules.find(module => module.id === req.params.id);
    await module.disconnect();
    const index = recipe_manager.modules.indexOf(module, 0);
    if (index > -1) {
        recipe_manager.modules.splice(index, 1);
    }
    res.send('Successful deleted');
});

