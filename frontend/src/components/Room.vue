<script setup>
import { ref, reactive, watchEffect, nextTick, onMounted, computed } from 'vue';
import axios from 'axios';
import { useGlobalStore } from '@/stores/globals.js';
import { useAlertStore } from '@/stores/alertStore';
import { useRoute, useRouter } from 'vue-router';
import uploadModal from './Modals/uploadModal.vue';
import downloadModal from './Modals/downloadModal.vue';

const store = useGlobalStore();
const alertStore = useAlertStore();
const route = useRoute();
const router = useRouter();
const BE_API_BASE_URL = import.meta.env.VITE_BE_API_BASE_URL;

const messagesContainer = ref(null); // for scroll down when new message add
const messageInput = ref('');
const messages = reactive([]); // to store chat messages
let enterPressedOnce = false; // send message if pressing enter key twice

const showChat = ref(true);
const switchBtnText = computed(() => {
    return showChat.value ? 'See Files' : 'See Chat';
});

const files = ref([]);

const showUploadModal = ref(false);
const receiverID = ref();
const showDownloadModal = ref(false);
const fileId = ref();

const openDownloadModal = (recFileId) => {
    showDownloadModal.value = true;
    fileId.value = recFileId;
};
const userDeviceLabel = (userId) => {
    if (store.namePairs[userId] === undefined) {
        return userId.slice(0, 8);
    }
    return store.namePairs[userId];
};

watchEffect(async () => {
    // 如果沒有 roomToken 或 user.id，直接退出
    if (!store.roomToken || !store.user.id) {
        return;
    }
    try {
        const needJoinRoom = route.query.needJoinRoom;

        if (needJoinRoom !== 'false') {
            const { data } = await axios.post(`${BE_API_BASE_URL}/rooms/${store.roomToken}/join`, { user: store.user });
            // 更新 store 的數據
            if (data.members.length !== 0) {
                store.members = data.members;

                if (data.namePairs !== undefined) {
                    Object.keys(data.namePairs).forEach((userId) => {
                        if (store.namePairs[userId] === undefined) {
                            store.namePairs[userId] = data.namePairs[userId];
                        }
                    });
                }

                store.qrCodeSrc = data.qrCodeDataUrl;
                sessionStorage.setItem('qrCodeSrc', store.qrCodeSrc);
                store.clientSocket.emit('join chatroom', { roomToken: store.roomToken });
            } else {
                store.roomToken = '';
                sessionStorage.setItem('roomToken', '');
                router.push({ path: '/' });
                alertStore.addAlert('邀請碼不存在', 'error');
            }
            // set needJoinRoom to false
            await router.replace({
                ...route,
                query: {
                    ...route.query,
                    needJoinRoom: 'false',
                },
            });
        }
    } catch (error) {
        console.error('Error joining the room:', error);
    }
});

// Ensure that listener is binded after store.clientSocker is loaded
watchEffect(() => {
    if (store.clientSocket) {
        store.clientSocket.off('chat message');
        store.clientSocket.off('transfer notify');

        // bind chat message listener
        store.clientSocket.on('chat message', async (res) => {
            if (res.roomToken === store.roomToken) {
                const newMessageReceive = {
                    userId: res.message.senderID,
                    content: res.message.content,
                    timestamp: new Date().toLocaleTimeString(),
                };
                try {
                    messages.push(newMessageReceive);
                    await nextTick(); // wait until new messages render
                    scrollToBottom(); // than scroll to buttom
                    sessionStorage.setItem('messages', JSON.stringify(messages));
                } catch (error) {
                    console.error('Error processing incoming message:', error);
                }
            }
        });

        store.clientSocket.on('transfer notify', async (res) => {
            if (res.roomToken === store.roomToken && res.event === 'transfer notify' && res.fileId) {
                openDownloadModal(res.fileId);
            }
        });
    }
});

const sendMessage = async () => {
    if (messageInput.value.trim()) {
        const newMessage = {
            userId: store.user.id,
            content: messageInput.value,
            timestamp: new Date().toLocaleTimeString(),
        };
        try {
            // Send the message
            store.clientSocket.emit('chat message', { roomToken: store.roomToken, message: messageInput.value });
            // Add the new message to the messages array
            messages.push(newMessage);
            messageInput.value = ''; // Clear input
            await nextTick();
            scrollToBottom();
            sessionStorage.setItem('messages', JSON.stringify(messages));
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
};

const scrollToBottom = () => {
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

const handleEnter = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // prevent default behavior and avoid line breaks

        if (enterPressedOnce) {
            sendMessage();
            enterPressedOnce = false;
        } else {
            enterPressedOnce = true;
            setTimeout(() => {
                enterPressedOnce = false;
            }, 1000);
        }
    }
};

const handleSwitch = async () => {
    showChat.value = !showChat.value;
    if (showChat.value === false) {
        await getRoomStagingFile();
    }
};

const openUploadModal = (recID) => {
    showUploadModal.value = true;
    receiverID.value = recID;
};

const getRoomStagingFile = async () => {
    try {
        const response = await axios.get(`${BE_API_BASE_URL}/staging-area?id=${store.roomToken}&type=room`);

        if (response.status === 200) {
            files.value = response.data.file;
        } else {
            files.value = [];
        }
    } catch (err) {
        files.value = [];
    }
};

onMounted(async () => {
    const storedMessages = sessionStorage.getItem('messages'); // get stored messages when page is refresh
    if (storedMessages) {
        try {
            const parsedMessages = JSON.parse(storedMessages);
            if (Array.isArray(parsedMessages)) {
                parsedMessages.forEach((msg) => messages.push(msg));
            }
        } catch (error) {
            console.error('Error parsing stored messages:', error);
        }
    } else {
        messages.splice(0);
    }
    await nextTick();
    scrollToBottom();
});
</script>
<template>
    <div class="row container-fluid m-0 p-0 h-100">
        <!-- Left Content -->
        <div class="col-11 col-sm-9 d-flex flex-column align-items-center justify-content-center">
            <div class="row d-flex justify-content-center">
                <div class="col-auto d-flex align-items-center mb-3" v-for="(userId, index) in store.members">
                    <!-- computer card -->
                    <div
                        class="card bg-transparent border-0 text-center"
                        style="width: 120px"
                        v-if="userId !== store.user.id"
                        @click="openUploadModal(userId)"
                    >
                        <!-- icon -->
                        <div class="card-body d-flex justify-content-center align-items-center p-0">
                            <i class="bi bi-laptop display-1 p-0 icon"></i>
                        </div>
                        <!-- name -->
                        <div class="card-footer p-0 border-0 bg-transparent">
                            {{ userDeviceLabel(userId) }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="row d-flex justify-content-center mt-3 hide-as-phone">
                <button class="btn" @click="handleSwitch">{{ switchBtnText }}</button>
            </div>
            <uploadModal
                :showUploadModal="showUploadModal"
                :receiverID="receiverID"
                @update:showUploadModal="(val) => (showUploadModal = val)"
            />
            <downloadModal
                :showDownloadModal="showDownloadModal"
                :fileId="fileId"
                @update:showDownloadModal="(val) => (showDownloadModal = val)"
            />
            <!-- ChatCanva -->
            <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasRightChat" aria-labelledby="offcanvasRightChatLabel" data-bs-backdrop="static">
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title" id="offcanvasRightChatLabel">聊天</h5>
                    <i class="bi bi-x h1 close" data-bs-dismiss="offcanvas" aria-label="Close"></i>
                </div>
                <div class="offcanvas-body">
                    <div class="chat-box h-100">
                        <!-- Chat messages -->
                        <div class="messages-container px-3 py-2 overflow-auto" ref="messagesContainer">
                            <transition-group name="fade" tag="div">
                                <div
                                    class="message d-flex flex-column"
                                    v-for="(message, index) in messages"
                                    :key="index"
                                >
                                    <div v-if="message.userId === store.user.id" class="d-flex justify-content-end mb-3">
                                        <div class="message-body p-2 rounded text-end float-end">
                                            {{ message.content }}
                                        </div>
                                    </div>
                                    <div v-else class="d-flex flex-column justify-content-start mb-3">
                                        <div class="message-header justify-content-between">
                                            <strong>{{ userDeviceLabel(message.userId) }}</strong>
                                            <span></span>
                                        </div>
                                        <div class="message-body p-2 rounded">
                                            {{ message.content }}
                                        </div>
                                    </div>
                                </div>
                            </transition-group>
                        </div>

                        <!-- Message input and send button -->
                        <div class="input-group p-2">
                            <input
                                type="text"
                                v-model="messageInput"
                                class="form-control"
                                placeholder="輸入訊息～"
                                @keyup="handleEnter"
                                @input="resizeTextarea"
                            />
                            <button class="btn" @click="sendMessage">Send</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FilesCanva -->
            <div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasRightFiles" aria-labelledby="offcanvasRightFilesLabel" data-bs-backdrop="static">
                <div class="offcanvas-header">
                    <h5 class="offcanvas-title" id="offcanvasRightFilesLabel">檔案清單</h5>
                    <i class="bi bi-x h1 close" data-bs-dismiss="offcanvas" aria-label="Close"></i>
                </div>
                <div class="offcanvas-body p-0">
                    <div class="chat-box h-100">
                        <!-- Chat messages -->
                        <div class="messages-container px-3 py-2 overflow-auto" ref="messagesContainer">
                            <transition-group name="fade" tag="div">
                                <div
                                    v-if="files.length === 0"
                                    class="d-flex flex-column align-items-center mt-5"
                                >
                                    No file now
                                </div>
                                <div v-else class="d-flex" v-for="(file, fileIndex) in files" :key="fileIndex">
                                    <div class="d-flex flex-column justify-content-start mb-3 w-100">
                                        <div class="file-body p-2 rounded d-flex align-items-center">
                                            <i :class="$getFileIcon(file.filename)" class="m-2 h1"></i>
                                            <div class="flex-grow-1">
                                                <a :href="file.presignedUrl" class="p-0 fw-bolder" target="_blank">
                                                    {{ file.filename }} </a
                                                ><br />
                                                <small class="fw-light">
                                                    Sent At:
                                                    {{
                                                        new Date(file.lastModified).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                    }}
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </transition-group>
                        </div>

                        <!-- Button -->
                        <div class="input-group p-2 justify-content-center mb-2">
                            <button class="btn" @click="getRoomStagingFile">更新檔案清單</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Right Content - ChatRoom -->
        <div class="col-0 col-sm-3 chat-room p-0 d-flex flex-column hide-as-phone">
            <div class="chat-box flex-grow-1 hide-as-phone">
                <!-- Chat messages -->
                <div class="messages-container px-3 py-2 overflow-auto" ref="messagesContainer">
                    <transition-group name="fade" tag="div">
                        <div
                            v-if="showChat"
                            class="message d-flex flex-column"
                            v-for="(message, index) in messages"
                            :key="index"
                        >
                            <div v-if="message.userId === store.user.id" class="d-flex justify-content-end mb-3">
                                <div class="message-body p-2 rounded text-end float-end">
                                    {{ message.content }}
                                </div>
                            </div>
                            <div v-else class="d-flex flex-column justify-content-start mb-3">
                                <div class="message-header justify-content-between">
                                    <strong>{{ userDeviceLabel(message.userId) }}</strong>
                                    <span></span>
                                </div>
                                <div class="message-body p-2 rounded">
                                    {{ message.content }}
                                </div>
                            </div>
                        </div>
                        <div
                            v-else-if="!showChat && files.length === 0"
                            class="d-flex flex-column align-items-center mt-5"
                        >
                            No file now
                        </div>
                        <div v-else class="d-flex" v-for="(file, fileIndex) in files" :key="fileIndex">
                            <div class="d-flex flex-column justify-content-start mb-3 w-100">
                                <div class="file-body p-2 rounded d-flex align-items-center">
                                    <i :class="$getFileIcon(file.filename)" class="m-2 h1"></i>
                                    <div class="flex-grow-1">
                                        <a :href="file.presignedUrl" class="p-0 fw-bolder" target="_blank">
                                            {{ file.filename }} </a
                                        ><br />
                                        <small class="fw-light">
                                            Sent At:
                                            {{
                                                new Date(file.lastModified).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                            }}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </transition-group>
                </div>

                <!-- Message input and send button -->
                <div v-if="showChat" class="input-group p-2">
                    <input
                        type="text"
                        v-model="messageInput"
                        class="form-control"
                        placeholder="輸入訊息～"
                        @keyup="handleEnter"
                        @input="resizeTextarea"
                    />
                    <button class="btn hide-as-phone" @click="sendMessage">Send</button>
                </div>
                <div v-else class="input-group p-2 justify-content-center mb-2">
                    <button class="btn" @click="getRoomStagingFile">更新檔案清單</button>
                </div>
            </div>
        </div>
        <div class="col-1 col-sm-0 fix-right">
            <!-- 固定按鈕 -->
            <i class="bi bi-chat-right-dots h2" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRightChat" aria-controls="offcanvasRightChat"></i>
            <i class="bi bi-list h2" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRightFiles" aria-controls="offcanvasRightFiles" @click="getRoomStagingFile"></i>
        </div>
    </div>
</template>

<style scoped>
.icon {
    color: var(--color-text);
}

.card-footer {
    color: var(--color-text);
}

.chat-room {
    background-color: var(--color-background-soft);
    max-height: 100%;
    z-index: 1;
}

.chat-box {
    max-height: 100%;
}

.messages-container {
    max-height: calc(100% - 55px);
    height: calc(100% - 55px);
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.messages-container::-webkit-scrollbar {
    display: none; /* Chrome、Safari hide scroll */
}

.message-header {
    font-size: 0.9rem;
}

.message-body {
    display: inline-block;
    max-width: 70%;
    font-size: 1rem;
    word-break: break-word;
    overflow: hidden;
    background-color: var(--color-background-2);
}

.file-body {
    color: var(--color-text);
    word-break: break-word;
    overflow: hidden;
    background-color: var(--color-background-2);
}

.input-group {
    align-items: center;
    gap: 0.5rem;
    height: 55px;
}

.input-group input {
    padding: 0.5rem;
    font-size: 0.9rem;
}

.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from {
    opacity: 0;
    transform: translateY(10px);
}

.fade-enter-to {
    opacity: 1;
    transform: translateY(0);
}

.btn {
    background-color: rgba(29, 94, 225, 0.918);
    color: rgb(255, 255, 255);
}

.fix-right {
    position: fixed;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    /*z-index: 1050;  確保按鈕在前 */
}

.offcanvas {
    background-color: var(--color-background-soft);
    color: var(--color-text);
}

.btn-close {
    color: var(--color-text) !important;
}

.close {
    position: fixed;
    right: 5px;
}
</style>
