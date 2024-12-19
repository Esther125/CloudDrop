<script setup>
import { ref, reactive, watchEffect, nextTick, onMounted, computed } from 'vue';
import axios from 'axios';
import { useGlobalStore } from '@/stores/globals.js';
import { useRoute, useRouter } from 'vue-router';
import uploadModal from './Modals/uploadModal.vue';

const store = useGlobalStore();
const route = useRoute();
const router = useRouter();
const BE_API_BASE_URL = import.meta.env.VITE_BE_API_BASE_URL;

const messagesContainer = ref(null); // for scroll down when new message add
const messageInput = ref('');
const messages = reactive([]); // to store chat messages
let enterPressedOnce = false; // send message if pressing enter key twice

const showChat = ref(true);
const switchBtnText = computed(() => {
  return showChat.value ? "See Files" : "See Chat";
});

const files = reactive([])

watchEffect(async () => {
    // 如果沒有 roomToken 或 user.id，直接退出
    if (!store.roomToken || !store.user.id) {
        return;
    }
    try {
        const needJoinRoom = route.query.needJoinRoom

        if (needJoinRoom !== 'false') {
            const { data } = await axios.post(`${BE_API_BASE_URL}/rooms/${store.roomToken}/join`, { user: store.user });
            // 更新 store 的數據
            if (data.members.length !== 0) {
                store.members = data.members;
                store.qrCodeSrc = data.qrCodeDataUrl;
                sessionStorage.setItem('qrCodeSrc', store.qrCodeSrc);
                store.clientSocket.emit('join chatroom', { roomToken: store.roomToken });
            } else {
                store.roomToken = ''
                sessionStorage.setItem('roomToken', '');
                router.push({ path: '/'});
                alert("邀請碼不存在")
            }
        }
    } catch (error) {
        console.error('Error joining the room:', error);
    }
});

// Ensure that listener is binded after store.clientSocker is loaded
watchEffect(() => {
    if (store.clientSocket) {
        if (!store.clientSocket.hasSetup) {
            store.clientSocket.hasSetup = true;

            // bind chat message listener
            store.clientSocket.on('chat message', async (res) => {
                console.log(res);
                if (res.roomToken === store.roomToken) {
                    const newMessageReceive = {
                        userId: res.message.senderID.slice(0, 8),
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
        }
    }
});

const sendMessage = async () => {
    if (messageInput.value.trim()) {
        const newMessage = {
            userId: store.user.id.slice(0, 8),
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

const handleSwitch = () => {
    showChat.value = !showChat.value
}

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
        <div class="col-9 d-flex flex-column align-items-center justify-content-center">
            <div class="row d-flex justify-content-center">
                <div class="col-auto d-flex align-items-center mb-3" v-for="(userId, index) in store.members">
                    <!-- computer card -->
                    <div 
                        class="card bg-transparent border-0 text-center"
                        style="width: 120px"
                        data-bs-toggle="modal"
                        v-if="userId !== store.user.id"
                        data-bs-target="#uploadModal"
                    >
                        <!-- icon -->
                        <div class="card-body d-flex justify-content-center align-items-center p-0">
                            <i class="bi bi-laptop display-1 p-0 icon"></i>
                        </div>
                        <!-- name -->
                        <div class="card-footer py-0 border-0 bg-transparent">
                            {{ userId.slice(0, 8) }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="row d-flex justify-content-center mt-3">
                <button class="btn" @click="handleSwitch">{{ switchBtnText }}</button>
            </div>
        </div>
        <!-- Right Content - ChatRoom -->
        <div class="col-3 chat-room p-0 d-flex flex-column">
            <div class="chat-box flex-grow-1">
                <!-- Chat messages -->
                <div class="messages-container px-3 py-2 overflow-auto" ref="messagesContainer">
                    <transition-group name="fade" tag="div">
                        <div v-if="showChat" class="message d-flex flex-column" v-for="(message, index) in messages" :key="index">
                            <div v-if="message.userId === store.user.id.slice(0, 8)" class="d-flex justify-content-end mb-3">
                                <div class="message-body p-2 rounded text-end float-end">
                                    {{ message.content }}
                                </div>
                            </div>
                            <div v-else class="d-flex flex-column justify-content-start mb-3">
                                <div class="message-header justify-content-between">
                                    <strong>{{ message.userId }}</strong>
                                    <span></span>
                                </div>
                                <div class="message-body p-2 rounded">
                                    {{ message.content }}
                                </div>
                            </div>
                        </div>
                        <div v-else-if="!showChat && files.length === 0" class="d-flex flex-column align-items-center mt-5">
                            No file now
                        </div>
                        <div v-else class="message d-flex flex-column" v-for="(file, fileIndex) in files" :key="fileIndex">
                            <div class="d-flex flex-column justify-content-start mb-3">
                                <div class="message-header justify-content-between mb-1">
                                    <strong>{{ file.sender }}</strong> send at {{ file.timestamp }}
                                </div>
                                <div class="message-body p-2 rounded">
                                    {{ file.fileName }}
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
                        @input="resizeTextarea"/>
                    <button class="btn" @click="sendMessage">Send</button>
                </div>
                <div v-else class="input-group p-2 justify-content-center">
                    <button class="btn" @click="">Send To Room</button>
                </div>
            </div>
        </div>
    </div>

    <!-- uploadModal -->
    <uploadModal />
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

.input-group {
    align-items: center;
    gap: 0.5rem;
    height: 55px;
}

.fade-enter-active, .fade-leave-active {
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
    background-color: rgba(29, 94, 225, 0.918);;
    color: rgb(255, 255, 255);
}

</style>
