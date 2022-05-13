const { v4: get_uuid} = require('uuid');
const express = require('express');

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

    get(id) {
        return id && this.users.find(u => u.id === id);
    }

    getNotDeleted(id) {
        const user = this.get(id);
        return user && user.isDeleted !== true ? user : undefined;
    }

    create({id, login, password, age}) {
        if (this.get(id)) {
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
        const user = this.getNotDeleted(id);
        if (!user) {
            throw new Error(`Cannot update - user id ${id} does not exists or removed`);
        }

        if (login) user.login = login;
        if (password) user.password = password;
        if (age) user.age = age;
    }

    delete(id, soft = true) {
        const user = this.get(id);
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
        return this.users
            .filter(u => !u.isDeleted && u.login && u.login.includes(loginSubstring))
            .sort((u1, u2) => u1.login > u2.login ? 1 :
                            u1.login < u2.login ? -1 : 0)
            .slice(0, limit);
    }

    getAllUsers() {
        return this.users;
    }
}

const users_db = new Users();

app.get('/api/user', function(_req, res) {
    res.json({users: users_db.getAllUsers()});
});

function verifyQueries(params, req, res, next) {
    let errMsg = '';
    if (req && req.query) {
        for (let param of params) {
            if (!req.query[param]) {
                errMsg = `Missing ${param} query`;
                res.status(400);
                res.send(errMsg);
                return;
            }
        }
        next();
    } else {
        res.status(400);
        res.send('Missing query parameters');
    }
}

app.get('/api/user/auto-suggest', verifyQueries.bind(this, ['limit', 'login']), function(req, res) {
    const users_limit = users_db.getAutoSuggestUsers(req.query.login, req.query.limit);
    res.json({users: users_limit});
});

app.get('/api/user/:id', function(req, res) {
    try {
        const user = users_db.getNotDeleted(req.params.id);
        if (user) {
            res.json({user});
        } else {
            res.status(400).send('User does not exist');
        }
    } catch(ee) {
        res.status(400).send(ee.toString());
    }
});

function handleCreateUser(req, res) {
    try {
        const { login, password, age } = req.body;
        if (login && password && age) {
            const retId = users_db.create({ id: req.params.id, login, password, age});
            res.json({status: "ok", userId: retId});
        } else {
            res.status(400).send('Missing parameters');
        }
    } catch(ee) {
        res.status(400).send(ee.toString());
    }
}

app.post('/api/user', handleCreateUser);
app.post('/api/user/:id', handleCreateUser);

app.put('/api/user/:id', function(req, res) {
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

app.use((_req, res) => {
    res.status(404);
    res.send('Not found');
});

app.listen(3000, function () {
    console.log('Server listens http://localhost:3000');
});
