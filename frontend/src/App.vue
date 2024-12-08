<script setup>
import { RouterLink, RouterView } from 'vue-router';
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue';
import axios from 'axios';
import Login from './components/LoginModal.vue';
import Logout from './components/LogoutModal.vue';

const isDarkTheme = ref(false);
const icon = ref();
const device = ref('Default');
const user = reactive({
    id: '0000',
});
const token = ref();
const apiUrl = import.meta.env.VITE_BE_API_BASE_URL;

const themeChangeHandler = (event) => {
    isDarkTheme.value = event.matches;
};

const iconChange = (isDarkTheme) => {
    if (isDarkTheme) {
        icon.value = '../src/assets/images/logo/icon_light.png';
    } else {
        icon.value = '../src/assets/images/logo/icon_dark.png';
    }
};

const roomModalHandler = async () => {
    try {
        const response = await axios.post(apiUrl + '/rooms', { user: user });
        token.value = response.data.token;
    } catch (error) {
        console.error('Error creating room: ', error);
    }
};

watch(isDarkTheme, iconChange);

onMounted(() => {
    // check theme
    isDarkTheme.value = window.matchMedia('(prefers-color-scheme: dark').matches;
    // add event listener
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChangeHandler);
    // init icon
    iconChange(isDarkTheme.value);
});

onBeforeUnmount(() => {
    // remove event listener
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', themeChangeHandler);
});
</script>

<template>
    <nav class="navbar navbar-expand-md fixed-top">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">
                <img :src="icon" width="30" height="24" class="d-inline-block align-text-top" />
                CloudDrop
            </a>
            <div class="d-flex justify-content-end align-items-center">
                <div class="link" data-bs-toggle="modal" data-bs-target="#roomModal">
                    <i class="bi bi-people-fill h3 icon" @click="roomModalHandler"></i>
                </div>

                <li class="nav-item dropdown">
                    <a
                        class="nav-link dropdown-toggle"
                        href="#"
                        id="navbarDropdown"
                        aria-expanded="false"
                        data-bs-toggle="dropdown"
                    >
                        <i class="bi bi-person-lines-fill h3 icon"></i>
                    </a>
                    <ul
                        :class="['dropdown-menu', { 'dropdown-menu-dark': isDarkTheme }]"
                        aria-labelledby="navbarDropdown"
                        style="position: absolute; top: 100%; left: auto; right: 0"
                    >
                        <li>
                            <RouterLink to="/about" class="dropdown-item">
                                <i class="bi bi-collection-fill h5 icon"></i> Temporary Storage
                            </RouterLink>
                        </li>
                        <li>
                            <RouterLink to="/history" class="dropdown-item">
                                <i class="bi bi-clock-history h5 icon"></i> History
                            </RouterLink>
                        </li>
                        <li>
                            <RouterLink to="/logout" class="dropdown-item">
                                <i class="bi bi-box-arrow-left h5 icon"></i> Logout
                            </RouterLink>
                        </li>
                    </ul>
                </li>
            </div>
        </div>
    </nav>

    <div>
        <RouterView />

        <!-- Room Modal -->
        <div class="modal fade" id="roomModal" tabindex="-1" aria-labelledby="roomModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="roomModalLabel">創建或加入房間</h5>
                    </div>
                    <div class="modal-body d-flex justify-content-center">
                        <div v-for="(letter, index) in token" :key="index" class="letter-box">
                            {{ letter }}
                        </div>
                    </div>
                    <div class="modal-footer"></div>
                </div>
            </div>
        </div>

        <Login />
        <Logout />
    </div>

    <nav class="navbar navbar-expand-md fixed-bottom d-flex justify-content-center navbar-bottom">
        <div class="card">
            <div class="card-body d-flex justify-content-center">
                <p class="card-text">裝置名稱：{{ device }}</p>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.navbar {
    background-color: var(--color-background-mute);
}

.navbar-bottom {
    background-color: var(--color-background);
}

.navbar-brand:hover,
.icon:hover,
.link:hover {
    background-color: var(--color-background-soft);
}

.icon {
    color: var(--color-text);
}

.link {
    margin: 0px 10px;
}

.dropdown .ul .li {
    background-color: var(--color-background-mute);
    color: var(--color-text);
}

.dropdown-item .icon {
    margin-right: 5px;
}

.navbar-brand {
    color: var(--color-text);
}

.dropdown:hover .dropdown-menu {
    display: block;
    margin-top: 0;
}

.dropdown-toggle::after {
    display: none !important;
}

li {
    list-style-type: none;
}

.card {
    background-color: var(--color-card-background);
}

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

.letter-box {
    height: 100%;
    width: 6%;
    display: flex;
    align-items: center;
    justify-content: center;
    /* border: 1px solid #000; */
    border-radius: 10px;
    background-color: var(--color-modal-text-background);
    font-weight: bolder;
    margin: 0 3px;
}
</style>
