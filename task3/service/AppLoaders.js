import { joi as error_joi, default as error_default } from '../routers/errors.js';
import express from 'express';

export default class AppLoader {
    constructor(...routers) {
        const app = express();
        app.use(express.json());
        app.use(function(req, _res, next) {
            console.log(req.body);
            next();
        });

        for (let router of routers) {
            app.use(router);
        }

        app.use(error_joi);
        app.use(error_default);
        this.app = app;
    }

    start(port) {
        this.app.listen(port, () => console.log(`Server listens http://localhost:${port}`));
    }
}
