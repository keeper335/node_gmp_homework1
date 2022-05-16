import AppLoader from './service/AppLoaders.js';
import UserService from './service/UserService.js';
import createRouter from './routers/user.js';
const url = 'postgres://ygyhynng:bz2Yyaksava6geCCIiM_GEe6L-lp10gc@lallah.db.elephantsql.com/ygyhynng';

const userService = new UserService(url);
new AppLoader(createRouter(userService)).start(3000);
