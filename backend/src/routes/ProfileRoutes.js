import { Router } from 'express';
import ProfileController from '../controllers/profileController.js';

const profileRouter = Router();
const profileController = new ProfileController();

// 定義路由
profileRouter.get('/staging-area', profileController.getStagingFile);

export default profileRouter;
