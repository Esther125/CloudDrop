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

<script setup>
import { onMounted, ref } from 'vue';
import * as bootstrap from 'bootstrap';
import api from '@/api/api';

const logoutHandler = async () => {
    try {
        const response = await api.post('/logout');
    } catch (error) {
        console.error('Error logout: ', error);
    }
};

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

onMounted(() => {
    initModal();
    window.addEventListener('show-logout-modal', showModal);
    const modalElement = document.getElementById('logoutModal');
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
