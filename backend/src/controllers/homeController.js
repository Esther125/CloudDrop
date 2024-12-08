import HomeService from '../services/homeService.js';

class HomeController {
    constructor() {
        this.homeService = new HomeService();
    }

    index = (req, res) => {
        console.log('[HomeController] index');
        const userId = this.homeService.generateUniqueUUID();
        res.status(200).json({ userId: userId });
    };
}

export default HomeController;
