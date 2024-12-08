import RoomService from '../services/roomsService.js';

class RoomsController {
    constructor() {
        this.roomService = new RoomService();
    }

    createRoom = async (req, res) => {
        console.log('[RoomsController] -----createRoom-----');

        let user;
        try {
            user = req.body.user;
            if (!user) {
                console.error('[RoomsController] Error when creating room - User object is required');
                return res.status(400).json({ message: 'User object is required' });
            }

            if (!user.id || user.id.length === 0) {
                console.error('[RoomsController] Error when creating room - User id is required');
                return res.status(400).json({ message: 'User id is required' });
            }

            const roomObj = await this.roomService.createRoom(user.id);
            res.status(201).json(roomObj);
        } catch {
            console.error(`[RoomsController] Error when creating room for ${user.id}`);
            res.status(500).json({ message: `Error when creating room for ${user.id}` });
        }
    };

    joinRoom = async (req, res) => {
        console.log('[RoomsController] -----joinRoom-----');

        let user;
        let token;
        try {
            user = req.body.user;
            token = req.params.roomToken;

            if (!user) {
                console.error('[RoomsController] Error when joining room - User object is required');
                return res.status(400).json({ message: 'User object is required' });
            }

            if (!user.id || user.id.length === 0) {
                console.error('[RoomsController] Error when joining room - User id is required');
                return res.status(400).json({ message: 'User id is required' });
            }

            const joinRoomObj = await this.roomService.joinRoom(user.id, token);
            res.status(200).json(joinRoomObj);
        } catch {
            console.error(`[RoomsController] Error when joining room ${token} for user ${user.id}`);
            res.status(500).json({ message: `Error when when joining room ${token} for user ${user.id}` });
        }
    };
}

export default RoomsController;
