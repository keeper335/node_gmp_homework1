const { v4: get_uuid} = require('uuid');
const express = require('express');
const joi = require('joi');
const validator = require('express-joi-validation').createValidator({});

const app = express();
app.use(express.json());

app.use(function(req, _res, next) {
    console.log(req.body);
    next();
});

class User {
    constructor(id, login, password, age, isDeleted = false) {
        this.id = id ?? get_uuid();
        this.login = login;
        this.password = password;
        this.age = age;
        this.isDeleted = isDeleted;
    }
}

class Users {
    constructor() {
        this.users = [];
    }

    find(id) {
        return id && this.users.find(u => u.id === id);
    }

    get(id) {
        const user = this.find(id);
        if (user && user.isDeleted !== true) {
            const retUser = { ...user };
            delete retUser.isDeleted;
            return retUser;
        }
        return null;
    }

    create({id, login, password, age}) {
        if (this.find(id)) {
            throw new Error(`Cannot create - user id ${id} already exists`);
        }

        if (this.users.some(u => u.login === login)) {
            throw new Error(`Cannot create - user with the same login ${login} already exists`);
        }
        const newUser = new User(id, login, password, age);
        this.users.push(newUser);
        return newUser.id;
    }

    update({id, login, password, age}) {
        const user = this.find(id);
        if (!user || user.isDeleted === true) {
            throw new Error(`Cannot update - user id ${id} does not exists or removed`);
        }

        if (login) user.login = login;
        if (password) user.password = password;
        if (age) user.age = age;
    }

    delete(id, soft = true) {
        const user = this.find(id);
        if (!user) {
            throw new Error(`Cannot remove - user id ${id} does not exists`);
        }
        if (soft) {
            user.isDeleted = true;
        } else {
            this.users = this.users.filter(u => u.id !== id);
        }
    }

    getAutoSuggestUsers(loginSubstring, limit = 0) {
        const retUsers = this.getAll()
            .filter(u => u.login && u.login.includes(loginSubstring))
            .sort((u1, u2) => u1.login > u2.login ? 1 :
                            u1.login < u2.login ? -1 : 0);
        return limit > 0 ? retUsers.slice(0, limit) : retUsers;
    }

    getAll() {
        console.log(this.users); // for debug 
        return this.users.reduce((prev, curr) => {
            if (curr.isDeleted !== true) {
                const retUser = { ...curr };
                delete retUser.isDeleted;
                prev.push(retUser);
            }
            return prev;
        }, []);
    }
}

const users_db = new Users();

app.get('/api/user', function(_req, res) {
    res.json({users: users_db.getAll()});
});

const querySchema = joi.object({
    limit: joi.number().integer().min(0).required(),
    login: joi.string().alphanum().required()
});

app.get('/api/user/auto-suggest', validator.query(querySchema), function(req, res) {
    const users_limit = users_db.getAutoSuggestUsers(req.query.login, req.query.limit);
    res.json({users: users_limit});
});

app.get('/api/user/:id', function(req, res) {
    try {
        const user = users_db.get(req.params.id);
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
    .pattern(new RegExp('^.*(?=.{2,})(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9]+$'), 'letters and numbers').required(),
  age: joi.number().integer().min(4).max(130).required()
});

function handleCreateUser(req, res) {
    try {
        const { login, password, age } = req.body;
        const retId = users_db.create({ id: req.params.id, login, password, age});
        res.json({status: "ok", userId: retId});
    } catch(ee) {
        res.status(400).send(ee.toString());
    }
}

app.post('/api/user', validator.body(userSchema), handleCreateUser);
app.post('/api/user/:id', validator.body(userSchema), handleCreateUser);

app.put('/api/user/:id', validator.body(userSchema), function(req, res) {
    try {
        const { login, password, age } = req.body;
        users_db.update({ id: req.params.id, login, password, age });
        res.end('User updated');
    } catch(ee) {
        res.status(400).send(ee.toString());
    }
});

app.delete('/api/user/:id', function(req, res) {
    try {
        const softRemove = req.query.soft === "false" ? false : true;
        users_db.delete(req.params.id, softRemove);
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
