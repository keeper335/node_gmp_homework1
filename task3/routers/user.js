import { Router } from "express";
import joi from 'joi';
import { createValidator } from 'express-joi-validation';
const validator = createValidator({});

export default (users_db) => {
    const router = Router();
    router.get('/api/user', async function(_req, res) {
        res.json({users: await users_db.getAll()});
    });
    
    const querySchema = joi.object({
        limit: joi.number().integer().min(0).required(),
        login: joi.string().alphanum().required()
    });
    
    router.get('/api/user/auto-suggest', validator.query(querySchema), async function(req, res) {
        const users = await users_db.getAutoSuggestUsers(req.query.login, req.query.limit);
        res.json({users});
    });
    
    router.get('/api/user/:id', async function(req, res) {
        try {
            const user = await users_db.get(req.params.id);
            if (user) {
                res.json({user});
            } else {
                res.status(400).send('User does not exist');
            }
        } catch(ee) {
            res.status(400).send(ee.toString());
        }
    });

    const userSchema = joi.object({
        login: joi.string().alphanum().required(),
        password: joi.string()
          .pattern(/^.*(?=.{2,})(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9]+$/, 'letters and numbers').required(),
        age: joi.number().integer().min(4).max(130).required()
    });
    
    async function handleCreateUser(req, res) {
        try {
            const { login, password, age } = req.body;
            const userId = await users_db.create({ id: req.params.id, login, password, age});
            res.json({status: "ok", userId});
        } catch(ee) {
            res.status(400).send(ee.toString());
        }
    }
    
    router.post('/api/user', validator.body(userSchema), handleCreateUser);
    router.post('/api/user/:id', validator.body(userSchema), handleCreateUser);
    
    router.put('/api/user/:id', validator.body(userSchema), async function(req, res) {
        try {
            const { login, password, age } = req.body;
            await users_db.update({ id: req.params.id, login, password, age });
            res.end('User updated');
        } catch(ee) {
            res.status(400).send(ee.toString());
        }
    });
    
    router.delete('/api/user/:id', async function(req, res) {
        try {
            const softRemove = req.query.soft === "false" ? false : true;
            await users_db.delete(req.params.id, softRemove);
            res.end('User deleted');
        } catch(ee) {
            res.status(400).send(ee.toString());
        }
    });
    
    return router;
}
