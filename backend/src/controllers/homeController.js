import HomeService from '../services/homeService.js';
import { logWithFileInfo } from '../../logger.js';

class HomeController {
    constructor() {
        this.homeService = new HomeService();
    }

    index = (req, res) => {
        logWithFileInfo('info', '[HomeController] index');
        const userId = this.homeService.generateUniqueUUID();
        res.status(200).json({ userId: userId });
    };
}

export default HomeController;
