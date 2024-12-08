import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import jwtMiddleware from '../middlewares/jwtMiddleware.js';

const authRouter = Router();
const authController = new AuthController();

// 定義路由
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/logout', jwtMiddleware, authController.logout);
authRouter.get('/auth-check', jwtMiddleware, authController.authCheck);

export default authRouter;
