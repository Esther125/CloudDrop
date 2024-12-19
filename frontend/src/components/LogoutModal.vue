<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGlobalStore } from '../stores/globals.js';
import * as bootstrap from 'bootstrap';
import api from '@/api/api';
import axios from 'axios';
import { io as ioc } from 'socket.io-client';

const store = useGlobalStore();
const router = useRouter();

const BE_API_BASE_URL = import.meta.env.VITE_BE_API_BASE_URL;
const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL;

const AUTH_OPTIONS = (userID) => ({
    auth: {
        user: {
            id: userID,
        },
    },
});

let modalInstance;

const initModal = () => {
    const modalElement = document.getElementById('logoutModal');
    modalInstance = new bootstrap.Modal(modalElement);
};

const showModal = () => {
    if (modalInstance) {
        modalInstance.show();
    }
};

const logoutHandler = async () => {
    try {
        await api.post('/logout');

        // change userId
        const response = await axios.get(`${BE_API_BASE_URL}/`);
        const userId = response.data.userId;
        sessionStorage.setItem('userId', userId);
        store.user.id = userId;

        // clean out roomToken
        sessionStorage.removeItem('roomToken');
        store.roomToken = '';

        // use new userId to connect to websocket
        store.clientSocket.disconnect();
        store.clientSocket = ioc(CHAT_SERVER_URL, AUTH_OPTIONS(store.user.id));

        // redirection to home page
        router.push({ path: '/' });
    } catch (error) {
        console.error('Error logout: ', error);
    }
};

onMounted(() => {
    initModal();
    window.addEventListener('show-logout-modal', showModal);
    const modalElement = document.getElementById('logoutModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            if (window.location.pathname === '/logout') {
                router.push({ path: '/' });
            }
        });
    }
});
</script>

<template>
    <div class="modal fade" id="logoutModal" tabindex="-1" aria-labelledby="logoutModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header pt-3 pb-2 border-0">
                    <h5 class="modal-title b" id="logoutModalLabel">用戶登出</h5>
                </div>
                <div class="modal-body">
                    <p>確定登出？</p>
                </div>
                <div class="modal-footer d-flex justify-content-center">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal" @click="logoutHandler">
                        確定
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.modal-header,
.modal-footer {
    border-bottom: 0px;
    border-top: 0px;
}

.modal-content {
    background-color: var(--color-background-soft);
    color: var(--color-text);
    text-align: center;
}

.modal-title {
    width: 100%;
}

.modal-body {
    padding: 5px;
}

a:hover {
    text-decoration: underline;
    background-color: unset;
}
</style>
