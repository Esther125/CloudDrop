import { v4 as uuidv4 } from 'uuid';
import { logWithFileInfo } from '../../logger.js';

class HomeService {
    generateUniqueUUID = () => {
        logWithFileInfo('info', '[HomeService] Generate Unique UUID');
        return uuidv4();
    };
}

export default HomeService;
