import { Router } from 'express';
import HistoryController from '../controllers/historyController.js';

const historyRouter = Router();
const historyController = new HistoryController();

// 定義路由
historyRouter.get('/history', historyController.history);

export default historyRouter;
