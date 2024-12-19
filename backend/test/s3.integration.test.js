import S3Service from '../src/services/s3Service.js';

const testUpload = async () => {
    const s3Service = new S3Service();

    const mockFile = {
        tempFilePath: '../backend/test/tmp/test.txt',
        name: 'test.txt',
    };

    const mockFilename = 'unique-test-file.txt'; // 上傳到 S3 的檔案名稱
    const mockUserId = '12345'; // user ID
    const mockRoomId = '12345'; // room ID

    try {
        // user
        const userResult = await s3Service.uploadFile(mockFile, mockFilename, 'user', mockUserId);
        console.log('User Upload Success:', userResult);

        const userUrlResult = await s3Service.generatePresignedUrl(mockFilename, 'user', mockUserId);
        console.log(`User generate presigned Url Success`);

        // room
        const roomResult = await s3Service.uploadFile(mockFile, mockFilename, 'room', mockRoomId);
        console.log('Room Upload Success:', roomResult);

        const roomUrlResult = await s3Service.generatePresignedUrl(mockFilename, 'room', mockUserId);
        console.log(`User generate presigned Url Success`);
    } catch (error) {
        console.error('Upload Failed:', error.message);
    }
};

testUpload();
