import { expect } from 'chai';
import { io as ioc } from 'socket.io-client';

/*
expected response structure
1. event: system message
    {
        event: 'system message',
        message: {
            stage,
            status,
        },
        timestamp: new Date().toISOString(),
    }
    
2. event: room notify
    {
        event: "room notify",
        roomToken,
        userID, // 加入/離開 room 的 user
        type, // join, leave
        timestamp: new Date().toISOString(),
    }
        
3. event: transfer notify
    {
    event: 'transfer notify',
    roomToken,
    senderID,
    timestamp: new Date().toISOString(),
    }
            
4. event: chat message
    {
        event: 'chat message',
        roomToken,
        message: {
            senderID,
            content
        },
        timestamp: new Date().toISOString(),
    }
*/

const CHAT_SERVER_URL = `http://localhost:3000/socket`;
const AUTH_OPTIONS = (userID) => ({
    auth: {
        user: {
            id: userID,
        },
    },
});

// describe('Test: connect and disconnect to server for /socket', () => {
//     let clientSocket;

//     afterEach(async () => {
//         await new Promise((resolve, reject) => {
//             if (clientSocket.connected) {
//                 clientSocket.disconnect();
//             }
//             resolve();
//         });
//     });

//     it('Test: connect and disconnect to server for /socket (with correct connection format)', (done) => {
//         // connect to server
//         clientSocket = ioc(CHAT_SERVER_URL, AUTH_OPTIONS('0001'));

//         clientSocket.on('system message', (res) => {
//             console.log(res);
//             expect(res.event).to.be.equal('system message');
//             expect(res.message.stage).to.be.equal('connect');
//             expect(res.message.status).to.be.equal('success');
//             expect(res.message.content).to.be.equal('success');
//             done();
//         });
//     });

//     it('Test: connect and disconnect to server for /socket (with wrong connection format, without auth)', (done) => {
//         // connect to server
//         clientSocket = ioc(CHAT_SERVER_URL);

//         clientSocket.on('system message', (res) => {
//             console.log(res);
//             expect(res.event).to.be.equal('system message');
//             expect(res.message.stage).to.be.equal('connect');
//             expect(res.message.status).to.be.equal('fail');
//             expect(res.message.content).to.be.equal('userID required');
//             done();
//         });
//     });
// });

// describe('Test: join chatroom', () => {
//     let clientSocket2;
//     let clientSocket3;
//     let client2_3RoomToken = 'ABCDE';

//     beforeEach(async () => {
//         // 建立 2 個 client
//         clientSocket2 = ioc(CHAT_SERVER_URL, AUTH_OPTIONS('0002'));
//         clientSocket3 = ioc(CHAT_SERVER_URL, AUTH_OPTIONS('0003'));

//         await Promise.all([
//             new Promise((resolve, reject) => {
//                 clientSocket2.on('system message', (res) => {
//                     resolve();
//                 });
//             }),
//             new Promise((resolve, reject) => {
//                 clientSocket3.on('system message', (res) => {
//                     resolve();
//                 });
//             }),
//         ]);
//     });

//     afterEach(async () => {
//         // disconnect with server
//         await Promise.all([
//             new Promise((resolve, reject) => {
//                 if (clientSocket2.connected) {
//                     clientSocket2.disconnect();
//                 }
//                 resolve();
//             }),
//             new Promise((resolve, reject) => {
//                 if (clientSocket3.connected) {
//                     clientSocket3.disconnect();
//                 }
//                 resolve();
//             }),
//         ]);
//     });

//     it('Test: join chatroom (correct format)', (done) => {
//         clientSocket2.emit('join chatroom', { roomToken: client2_3RoomToken });

//         clientSocket2.on('system message', (res) => {
//             console.log(res);
//             expect(res.event).to.be.equal('system message');
//             expect(res.message.stage).to.be.equal('join chatroom');
//             expect(res.message.status).to.be.equal('success');
//             expect(res.message.content).to.be.equal('success');
//             done();
//         });
//     });

//     it('Test: join chatroom (without roomToken)', (done) => {
//         clientSocket2.emit('join chatroom');

//         clientSocket2.on('system message', (res) => {
//             console.log(res);
//             expect(res.event).to.be.equal('system message');
//             expect(res.message.stage).to.be.equal('join chatroom');
//             expect(res.message.status).to.be.equal('fail');
//             expect(res.message.content).to.be.equal('roomToken required');
//             done();
//         });
//     });

//     it('Test: join chatroom (已經有人在的房間，又有人再加入)', async () => {
//         clientSocket2.emit('join chatroom', { roomToken: client2_3RoomToken });

//         await new Promise((resolve, reject) => {
//             clientSocket2.on('system message', (res) => {
//                 console.log(res);
//                 expect(res.event).to.be.equal('system message');
//                 expect(res.message.stage).to.be.equal('join chatroom');
//                 expect(res.message.status).to.be.equal('success');
//                 expect(res.message.content).to.be.equal('success');
//                 resolve();
//             });
//         });

//         clientSocket3.emit('join chatroom', { roomToken: client2_3RoomToken });

//         await Promise.all([
//             new Promise((resolve, reject) => {
//                 clientSocket2.on('room notify', (res) => {
//                     // 先加入 room 的收到有人 join room 的通知
//                     console.log(res);
//                     expect(res.event).to.be.equal('room notify');
//                     expect(res.roomToken).to.be.equal(client2_3RoomToken);
//                     expect(res.userID).to.be.equal('0003');
//                     expect(res.type).to.be.equal('join');
//                     resolve();
//                 });
//             }),
//             new Promise((resolve, reject) => {
//                 // 後加入 room 的收到成功加入的通知
//                 clientSocket3.on('system message', (res) => {
//                     console.log(res);
//                     expect(res.event).to.be.equal('system message');
//                     expect(res.message.stage).to.be.equal('join chatroom');
//                     expect(res.message.status).to.be.equal('success');
//                     expect(res.message.content).to.be.equal('success');
//                     resolve();
//                 });
//             }),
//         ]);
//     });
// });

describe('Test: other (after joining chatroom)', () => {
    let clientSocket2;
    let clientSocket3;
    let client2_3RoomToken = 'ABCDE';
    let clientSocket5;
    let client5RoomToken = 'OPELG';

    beforeEach(async () => {
        // 建立 2 個 client
        clientSocket2 = ioc(CHAT_SERVER_URL, AUTH_OPTIONS('0002'));
        clientSocket3 = ioc(CHAT_SERVER_URL, AUTH_OPTIONS('0003'));
        clientSocket5 = ioc(CHAT_SERVER_URL, AUTH_OPTIONS('0005'));

        await Promise.all([
            new Promise((resolve, reject) => {
                clientSocket2.on('system message', (res) => {
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                clientSocket3.on('system message', (res) => {
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                clientSocket5.on('system message', (res) => {
                    resolve();
                });
            }),
        ]);

        // client 1 和 client 2 加入相同聊天室
        clientSocket2.emit('join chatroom', { roomToken: client2_3RoomToken });
        clientSocket3.emit('join chatroom', { roomToken: client2_3RoomToken });
        clientSocket5.emit('join chatroom', { roomToken: client5RoomToken });

        await Promise.all([
            new Promise((resolve, reject) => {
                clientSocket2.on('system message', (res) => {
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                clientSocket3.on('system message', (res) => {
                    resolve();
                });
            }),
            new Promise((resolve, reject) => {
                clientSocket5.on('system message', (res) => {
                    resolve();
                });
            }),
        ]);
    });

    afterEach(async () => {
        // disconnect with server
        await Promise.all([
            new Promise((resolve, reject) => {
                if (clientSocket2.connected) {
                    clientSocket2.disconnect();
                }
                resolve();
            }),
            new Promise((resolve, reject) => {
                if (clientSocket3.connected) {
                    clientSocket3.disconnect();
                }
                resolve();
            }),
            new Promise((resolve, reject) => {
                if (clientSocket5.connected) {
                    clientSocket5.disconnect();
                }
                resolve();
            }),
        ]);
    });

    describe('Test: request transfer', () => {
        it('Test: request transfer (對象: user + receiver 有存在該 room 內)', async () => {
            clientSocket2.emit('request transfer', {
                roomToken: client2_3RoomToken,
                fileId: '12345',
                receiverID: '0003',
            }); // user 0002 和 0003 都在 room client2_3RoomToken = 'ABCDE'

            await Promise.all([
                new Promise((resolve, reject) => {
                    // sender 收到 server 回覆成功處理
                    clientSocket2.on('system message', (res) => {
                        console.log(res);
                        expect(res.event).to.be.equal('system message');
                        expect(res.message.stage).to.be.equal('request transfer');
                        expect(res.message.status).to.be.equal('success');
                        expect(res.message.content).to.be.equal('success');
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    // receiver 收到系統的傳送通知
                    clientSocket3.on('transfer notify', (res) => {
                        console.log(res);
                        expect(res.event).to.be.equal('transfer notify');
                        expect(res.roomToken).to.be.equal(client2_3RoomToken);
                        expect(res.senderID).to.be.equal('0002');
                        resolve();
                    });
                }),
            ]);
        });

        it('Test: request transfer (對象: user + receiver 不存在該 room 內)', (done) => {
            clientSocket2.emit('request transfer', {
                roomToken: client2_3RoomToken,
                fileId: '12345',
                receiverID: '0005',
            }); // userID 0005 的 user 在 room client5RoomToken = 'OPELG'

            clientSocket2.on('system message', (res) => {
                console.log(res);
                expect(res.event).to.be.equal('system message');
                expect(res.message.stage).to.be.equal('request transfer');
                expect(res.message.status).to.be.equal('fail');
                expect(res.message.content).to.be.equal(`receiver not in room ${client2_3RoomToken}`);
                done();
            });
        });

        it('Test: request transfer (對象: user + 傳給自己)', (done) => {
            clientSocket2.emit('request transfer', {
                roomToken: client2_3RoomToken,
                fileId: '12345',
                receiverID: '0002',
            }); // user 0002 和 0003 都在 room client2_3RoomToken = 'ABCDE'

            clientSocket2.on('system message', (res) => {
                console.log(res);
                expect(res.event).to.be.equal('system message');
                expect(res.message.stage).to.be.equal('request transfer');
                expect(res.message.status).to.be.equal('fail');
                expect(res.message.content).to.be.equal(`sender and receiver are the same`);
                done();
            });
        });

        it('Test: request transfer (對象: room + sender 有在該 room 內)', async () => {
            clientSocket2.emit('request transfer', {
                fileId: '12345',
                roomToken: client2_3RoomToken,
            });

            await Promise.all([
                new Promise((resolve, reject) => {
                    // sender 收到 server 回覆成功處理
                    clientSocket2.on('system message', (res) => {
                        console.log(res);
                        expect(res.event).to.be.equal('system message');
                        expect(res.message.stage).to.be.equal('request transfer');
                        expect(res.message.status).to.be.equal('success');
                        expect(res.message.content).to.be.equal('success');
                        resolve();
                    });
                }),
                new Promise((resolve, reject) => {
                    // room 中的其他 user 收到系統的傳送通知
                    // user 0002 和 0003 都在 room client2_3RoomToken = 'ABCDE'
                    clientSocket3.on('transfer notify', (res) => {
                        console.log(res);
                        expect(res.event).to.be.equal('transfer notify');
                        expect(res.roomToken).to.be.equal(client2_3RoomToken);
                        expect(res.senderID).to.be.equal('0002');
                        resolve();
                    });
                }),
            ]);
        });

        it('Test: request transfer (sender 不在該 room 中)', (done) => {
            clientSocket2.emit('request transfer', {
                fileId: '12345',
                roomToken: client5RoomToken,
            });

            clientSocket2.on('system message', (res) => {
                console.log(res);
                expect(res.event).to.be.equal('system message');
                expect(res.message.stage).to.be.equal('request transfer');
                expect(res.message.status).to.be.equal('fail');
                expect(res.message.content).to.be.equal(`sender not in room ${client5RoomToken}`);
                done();
            });
        });
    });
});

//     describe('Test: chat message', () => {
//         it('Test: send message (給目前 user 所在的房間)', async () => {
//             const message = 'Hi';
//             clientSocket2.emit('chat message', { roomToken: client2_3RoomToken, message });

//             await Promise.all([
//                 new Promise((resolve, reject) => {
//                     // sender 收到系統回傳結果通知
//                     clientSocket2.on('system message', (res) => {
//                         console.log(res);
//                         expect(res.event).to.be.equal('system message');
//                         expect(res.message.stage).to.be.equal('chat message');
//                         expect(res.message.status).to.be.equal('success');
//                         expect(res.message.content).to.be.equal('success');
//                         resolve();
//                     });
//                 }),
//                 new Promise((resolve, reject) => {
//                     // chatroom 中其他 user 收到訊息
//                     clientSocket3.on('chat message', (res) => {
//                         console.log(res);
//                         expect(res.event).to.be.equal('chat message');
//                         expect(res.roomToken).to.be.equal(client2_3RoomToken);
//                         expect(res.message.senderID).to.be.equal('0002');
//                         expect(res.message.content).to.be.equal(message);
//                         resolve();
//                     });
//                 }),
//             ]);
//         });

//         it('Test: send message (給目前 user 不在的房間)', (done) => {
//             const message = 'Hi';
//             clientSocket2.emit('chat message', { roomToken: '30943', message });

//             clientSocket2.on('system message', (res) => {
//                 console.log(res);
//                 expect(res.event).to.be.equal('system message');
//                 expect(res.message.stage).to.be.equal('chat message');
//                 expect(res.message.status).to.be.equal('fail');
//                 expect(res.message.content).to.be.equal(`sender not in room 30943`);
//                 done();
//             });
//         });
//         it('Test: send message (wrong format 1)', (done) => {
//             const message = 'Hi';
//             clientSocket2.emit('chat message');

//             clientSocket2.on('system message', (res) => {
//                 console.log(res);
//                 expect(res.event).to.be.equal('system message');
//                 expect(res.message.stage).to.be.equal('chat message');
//                 expect(res.message.status).to.be.equal('fail');
//                 expect(res.message.content).to.be.equal(`roomToken, message required`);
//                 done();
//             });
//         });
//         it('Test: send message (wrong format 2)', (done) => {
//             const message = 'Hi';
//             clientSocket2.emit('chat message', { roomToken: '30943' });

//             clientSocket2.on('system message', (res) => {
//                 console.log(res);
//                 expect(res.event).to.be.equal('system message');
//                 expect(res.message.stage).to.be.equal('chat message');
//                 expect(res.message.status).to.be.equal('fail');
//                 expect(res.message.content).to.be.equal(`message required`);
//                 done();
//             });
//         });
//         it('Test: send message (wrong format 3)', (done) => {
//             const message = 'Hi';
//             clientSocket2.emit('chat message', { message });

//             clientSocket2.on('system message', (res) => {
//                 console.log(res);
//                 expect(res.event).to.be.equal('system message');
//                 expect(res.message.stage).to.be.equal('chat message');
//                 expect(res.message.status).to.be.equal('fail');
//                 expect(res.message.content).to.be.equal(`roomToken required`);
//                 done();
//             });
//         });
//     });

//     describe('Test: leave chatroom', () => {
//         it('Test: leave chatroom (目前 user 所在的房間)', async () => {
//             clientSocket2.emit('leave chatroom', { roomToken: client2_3RoomToken });

//             await Promise.all([
//                 new Promise((resolve, reject) => {
//                     // sender 收到系統回傳結果通知
//                     clientSocket2.on('system message', (res) => {
//                         console.log(res);
//                         expect(res.event).to.be.equal('system message');
//                         expect(res.message.stage).to.be.equal('leave chatroom');
//                         expect(res.message.status).to.be.equal('success');
//                         expect(res.message.content).to.be.equal('success');
//                         resolve();
//                     });
//                 }),
//                 new Promise((resolve, reject) => {
//                     // chatroom 中其他 user 收到有人 leave room 的通知
//                     clientSocket3.on('room notify', (res) => {
//                         console.log(res);
//                         expect(res.event).to.be.equal('room notify');
//                         expect(res.roomToken).to.be.equal(client2_3RoomToken);
//                         expect(res.userID).to.be.equal('0002');
//                         expect(res.type).to.be.equal('leave');
//                         resolve();
//                     });
//                 }),
//             ]);
//         });

//         it('Test: leave chatroom (目前 user 不在的房間)', async () => {
//             clientSocket2.emit('leave chatroom', { roomToken: '30943' });

//             await new Promise((resolve, reject) => {
//                 clientSocket2.on('system message', (res) => {
//                     console.log(res);
//                     expect(res.event).to.be.equal('system message');
//                     expect(res.message.stage).to.be.equal('leave chatroom');
//                     expect(res.message.status).to.be.equal('fail');
//                     expect(res.message.content).to.be.equal(`user not in room 30943`);
//                     resolve();
//                 });
//             });
//         });

//         it('Test: leave chatroom (wrong format)', async () => {
//             clientSocket2.emit('leave chatroom');

//             await new Promise((resolve, reject) => {
//                 clientSocket2.on('system message', (res) => {
//                     console.log(res);
//                     expect(res.event).to.be.equal('system message');
//                     expect(res.message.stage).to.be.equal('leave chatroom');
//                     expect(res.message.status).to.be.equal('fail');
//                     expect(res.message.content).to.be.equal(`roomToken required`);
//                     resolve();
//                 });
//             });
//         });
//     });

//     describe('Test: invalid event', () => {
//         it('Test: invalid event', (done) => {
//             clientSocket2.emit('xxxxxxxx');

//             clientSocket2.on('system message', (res) => {
//                 console.log(res);
//                 expect(res.event).to.be.equal('system message');
//                 expect(res.message.stage).to.be.equal('invalid event');
//                 expect(res.message.status).to.be.equal('fail');

//                 done();
//             });
//         });
//     });
// });
