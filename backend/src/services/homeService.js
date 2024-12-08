import { v4 as uuidv4 } from 'uuid';

class HomeService {
    generateUniqueUUID = () => {
        console.log('[HomeService] Generate Unique UUID');
        return uuidv4();
    };
}

export default HomeService;
