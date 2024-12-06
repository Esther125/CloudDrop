<script setup>
import { ref, watchEffect } from 'vue';
import axios from 'axios';
import { useGlobalStore } from '../stores/globals.js';
import { useRoute, useRouter } from 'vue-router';

const store = useGlobalStore();
const route = useRoute();
const router = useRouter();
const apiUrl = import.meta.env.VITE_BE_API_BASE_URL;

const messageInput = ref('');
const messages = ref([]);

watchEffect(async () => {
    // 如果沒有 roomToken 或 user.id，直接退出
    if (!store.roomToken || !store.user.id) {
        return;
    }
    try {
        const needJoinRoom = route.query.needJoinRoom

        if (needJoinRoom !== 'false') {
            const { data } = await axios.post(`${apiUrl}/rooms/${store.roomToken}/join`, { user: store.user });
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

const sendMessage = async () => {
    // To be done
    if (messageInput.value.trim()) {
        const newMessage = {
            userId: store.user.id,
            content: messageInput.value,
            timestamp: new Date().toLocaleTimeString(),
        };
        try {
            // Send the message to the backend

            // Add the new message to the messages array
            messages.value.push(messageInput);
            messageInput.value = ''; // Clear input
            //   scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
};

</script>
<template>
    <div class="row container-fluid m-0 p-0 h-100">
        <!-- Left Content -->
        <div class="col-9 d-flex align-items-center justify-content-center">
            <div class="row d-flex justify-content-center">
                <div class="col-auto d-flex align-items-center mb-3" v-for="(userId, index) in store.members">
                    <!-- computer card -->
                    <div class="card bg-transparent border-0 text-center shadow-sm" style="width: 120px">
                        <!-- icon -->
                        <div class="card-body d-flex justify-content-center align-items-center p-0">
                            <i class="bi bi-laptop display-1 p-0 icon"></i>
                        </div>
                        <!-- name -->
                        <div class="card-footer py-0">
                            {{ userId.slice(0, 8) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Right Content - ChatRoom -->
        <div class="col-3 chat-room p-0 d-flex flex-column">
            <div class="chat-box flex-grow-1">
                <!-- Chat messages -->
                <div class="messages-container px-3 py-2 overflow-auto" ref="messagesContainer">
                    <div class="message" v-for="(message, index) in messages" :key="index">
                        <div class="message-header d-flex justify-content-between">
                            <strong>{{ message.userId }}</strong>
                            <span>{{ message.timestamp }}</span>
                        </div>
                        <div class="message-body bg-light p-2 rounded">
                            {{ message.content }}
                        </div>
                    </div>
                </div>

                <!-- Message input and send button -->
                <div class="input-group p-2 border-top">
                    <input type="text" v-model="messageInput" class="form-control" placeholder="Type your message"
                        @keyup.enter="sendMessage" />
                    <button class="btn btn-primary ms-2" @click="sendMessage">Send</button>
                </div>
            </div>
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
    height: 100%;
}

.messages-container {
    height: calc(100% - 55px);
    overflow-y: auto;
    scrollbar-width: thin;
}

.message {
    border-bottom: 1px solid #969696;
    padding-bottom: 0.5rem;
}

.message-header {
    font-size: 0.9rem;
    color: #666;
}

.message-body {
    font-size: 1rem;
    word-break: break-word;
}

.input-group {
    align-items: center;
    gap: 0.5rem;
    height: 55px;
}
</style>
