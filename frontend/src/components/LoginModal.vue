<template>
    <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header pt-3 pb-2 border-0">
                    <h5 class="modal-title b" id="loginModalLabel">用戶登入</h5>
                </div>
                <div class="modal-body">
                    <form @submit.prevent="loginHandler">
                        <div class="m-3 d-flex justify-content-around">
                            <label for="email">帳號</label>
                            <input id="email" class="w-75" type="email" v-model="email" required />
                        </div>
                        <div class="m-3 d-flex justify-content-around">
                            <label for="password">密碼</label>
                            <input id="password" class="w-75" type="password" v-model="password" required />
                        </div>
                        <button type="submit" class="btn btn-primary" v-if="loginStatus === 'default'">登入</button>
                        <p class="text-success" v-else-if="loginStatus === 'success'">登入成功</p>
                        <p class="text-danger" v-else-if="loginStatus === 'fail'">登入失敗</p>
                    </form>
                    <div class="m-3 d-flex justify-content-around">
                        <a href="\register" class="text-secondary">立即註冊</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import * as bootstrap from 'bootstrap';
import axios from 'axios';

const email = ref();
const password = ref();
const loginStatus = ref('default');

const apiUrl = import.meta.env.VITE_BE_API_BASE_URL;

const loginHandler = async () => {
    try {
        const response = await axios.post(
            apiUrl + '/login',
            { email: email.value, password: password.value },
            { withCredentials: true }
        );
        loginStatus.value = 'success';
    } catch (error) {
        console.error('Error login: ', error);
        loginStatus.value = 'fail';
    }
};

let modalInstance;

const initModal = () => {
    const modalElement = document.getElementById('loginModal');
    modalInstance = new bootstrap.Modal(modalElement);
};

const showModal = () => {
    if (modalInstance) {
        loginStatus.value = 'default';
        modalInstance.show();
    }
};

onMounted(() => {
    initModal();
    window.addEventListener('show-login-modal', showModal);
    const modalElement = document.getElementById('loginModal');
    if (modalElement) {
        modalElement.addEventListener('hidden.bs.modal', () => {
            window.location.href = '/';
        });
    }
});
</script>

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
