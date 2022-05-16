import { Sequelize, Op } from 'sequelize';
import { getUserModel } from '../models/User.js';

export default class UserService {
    constructor(database_url) {
        this.sequelize = new Sequelize(database_url);
        this.User = getUserModel(this.sequelize);
    }

    async initDB() {
        try {
            this.sequelize.authenticate();
            console.log('Connected to DB');
            this.sequelize.sync({});

        } catch (e) {
            console.log('Failed to connect to DB: ', e)
        }
    }

    async get(id) {
        return id && this.User.findAll({
            attributes: {exclude: ['isDeleted']},
            where: {
                id,
                isDeleted: {[Op.not]: true}
            }
        });
    }

    async create({id, login, password, age}) {
        const user = await this.User.create({ id, login, password, age });
        return user.id;
    }

    async update({id, login, password, age}) {
        await this.User.update({login, password, age}, {
            where: {id}
        });
    }

    async delete(id, soft = true) {
        if (soft) {
            await this.User.update({isDeleted: true}, {
                where: {id}
            });
        } else {
            await this.User.destroy({
                where: {id}
            });
        }
    }

    async getAutoSuggestUsers(loginSubstring, limit) {
        if (!(limit > 0)) { // validation for non-number
            limit = undefined;
        }
        return this.User.findAll({
            order: this.sequelize.col('login'),
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
        return this.User.findAll({
            attributes: {exclude: ['isDeleted']},
            where: {
                isDeleted: {[Op.not]: true}
            }
        });
    }
}
