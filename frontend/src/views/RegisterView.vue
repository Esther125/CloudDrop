<template>
    <div class="register my-5 d-flex flex-column w-100">
        <h3 class="text-center w-100">用戶註冊</h3>
        <form @submit.prevent="registerHandler" class="w-75">
            <div class="m-3 d-flex justify-content-around">
                <label for="userName" class="w-25">用戶名稱</label>
                <input id="userName" class="w-75" type="text" v-model="userName" required />
            </div>
            <div class="m-3 d-flex justify-content-around">
                <label for="email" class="w-25">電子郵件</label>
                <input id="email" class="w-75" type="email" v-model="email" required />
            </div>
            <div class="m-3 d-flex justify-content-around">
                <label for="password" class="w-25">密碼</label>
                <input id="password" class="w-75" type="password" v-model="password" required />
            </div>
            <div class="d-flex justify-content-center">
                <button type="submit" class="btn btn-primary" v-if="registerStatus === 'default'">註冊</button>
                <p class="text-success" v-else-if="registerStatus === 'Register success'">註冊完成</p>
                <p class="text-danger" v-else>該帳號已註冊</p>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const userID = ref();
const userName = ref();
const email = ref();
const password = ref();

const registerStatus = ref('default');

const apiUrl = import.meta.env.VITE_BE_API_BASE_URL;

const getUserID = async () => {
    try {
        const response = await axios.get(apiUrl + '/');
        userID.value = response.data.userId;
    } catch (error) {
        console.error('Error getting userID: ', error);
    }
};

const registerHandler = async () => {
    try {
        await getUserID();
        const response = await axios.post(
            apiUrl + '/register',
            {
                userID: userID.value,
                email: email.value,
                password: password.value,
                userName: userName.value,
            },
            { withCredentials: true }
        );
        registerStatus.value = response.data.message;
    } catch (error) {
        console.error('Error register: ', error);
    }
};
</script>

<style scoped>
.register {
    display: flex;
    align-items: center;
}
</style>
