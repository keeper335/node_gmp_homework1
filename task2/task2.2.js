const { v4: get_uuid} = require('uuid');
const express = require('express');
const joi = require('joi');
const validator = require('express-joi-validation').createValidator({});

const { Sequelize, DataTypes, Op } = require('sequelize');
const sequelize = new Sequelize('postgres://ygyhynng:bz2Yyaksava6geCCIiM_GEe6L-lp10gc@lallah.db.elephantsql.com/ygyhynng');

try {
    sequelize.authenticate();
    console.log('Connected to DB');
} catch (e) {
    console.log('Failed to connect to DB: ', e)
}

const app = express();
app.use(express.json());

app.use(function(req, _res, next) {
    console.log(req.body);
    next();
});

const predefined_users = [
    {login: 'user1', password: '123qwe', age: 10},
    {login: 'user2', password: '456ert', age: 100},
    {login: 'user3', password: 'asd657', age: 50}
];

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
    },
    login: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false
});

class Users {
    constructor() {
        sequelize.sync({});
        
        User.bulkCreate(predefined_users);
    }

    async get(id) {
        return id && User.findAll({
            attributes: {exclude: ['isDeleted']},
            where: {
                id,
                isDeleted: {[Op.not]: true}
            }
        });
    }

    async create({id, login, password, age}) {
        const user = await User.create({ id, login, password, age });
        return user.id;
    }

    async update({id, login, password, age}) {
        await User.update({login, password, age}, {
            where: {id}
        });
    }

    async delete(id, soft = true) {
        if (soft) {
            await User.update({isDeleted: true}, {
                where: {id}
            });
        } else {
            await User.destroy({
                where: {id}
            });
        }
    }

    async getAutoSuggestUsers(loginSubstring, limit) {
        if (!(limit > 0)) { // validation for non-number
            limit = undefined;
        }
        return User.findAll({
            order: sequelize.col('login'),
            limit,
            attributes: {exclude: ['isDeleted']},
            where: {
                login: {
                    [Op.like]: `%${loginSubstring}%`
                },
                isDeleted: {[Op.not]: true}
            }
        });
    }

    async getAll() {
        return User.findAll({
            attributes: {exclude: ['isDeleted']},
            where: {
                isDeleted: {[Op.not]: true}
            }
        });
    }
}

const users_db = new Users();

app.get('/api/user', async function(_req, res) {
    res.json({users: await users_db.getAll()});
});

const querySchema = joi.object({
    limit: joi.number().integer().min(0).required(),
    login: joi.string().alphanum().required()
});

app.get('/api/user/auto-suggest', validator.query(querySchema), async function(req, res) {
    const users = await users_db.getAutoSuggestUsers(req.query.login, req.query.limit);
    res.json({users});
});

app.get('/api/user/:id', async function(req, res) {
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

app.post('/api/user', validator.body(userSchema), handleCreateUser);
app.post('/api/user/:id', validator.body(userSchema), handleCreateUser);

app.put('/api/user/:id', validator.body(userSchema), async function(req, res) {
    try {
        const { login, password, age } = req.body;
        await users_db.update({ id: req.params.id, login, password, age });
        res.end('User updated');
    } catch(ee) {
        res.status(400).send(ee.toString());
    }
});

app.delete('/api/user/:id', async function(req, res) {
    try {
        const softRemove = req.query.soft === "false" ? false : true;
        await users_db.delete(req.params.id, softRemove);
        res.end('User deleted');
    } catch(ee) {
        res.status(400).send(ee.toString());
    }
});

app.use((err, _req, res, next) => {
    if (err && err.error && err.error.isJoi) {
        res.status(400).json({
            type: err.type,
            message: err.error.toString()
        });
    } else {
        next(err);
    }
});

app.use((_req, res) => {
    res.status(404);
    res.send('Not found');
});

app.listen(3000, function () {
    console.log('Server listens http://localhost:3000');
});
