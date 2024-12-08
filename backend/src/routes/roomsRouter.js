import { Router } from 'express';
import RoomsController from '../controllers/roomsController.js';

const roomsRouter = Router();
const roomsController = new RoomsController();

roomsRouter.post('/rooms', roomsController.createRoom);
roomsRouter.post('/rooms/:roomToken/join', roomsController.joinRoom);

export default roomsRouter;
