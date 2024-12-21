<script setup>
import { ref, onMounted, watch } from 'vue';
import { useGlobalStore } from '@/stores/globals.js';
import { useAlertStore } from '@/stores/alertStore';


const BE_API_BASE_URL = import.meta.env.VITE_BE_API_BASE_URL;

const store = useGlobalStore();
const alertStore = useAlertStore();
let modalInstance = null;

const props = defineProps({
    showUploadModal: Boolean,
    receiverID: String
})

// 定義 emits
const emit = defineEmits(['update:showUploadModal']);

// 關閉 modal 的函式
const closeModal = () => {
    const fileInput = document.querySelector('#uploadModal input[type="file"]');
    if (fileInput) {
        fileInput.value = ''; // 清空檔案選擇器
    }
    resetPreviewState();
    emit('update:showUploadModal', false);
};

watch(() => props.showUploadModal, (newVal) => {
    if (modalInstance) {
        if (newVal) {
            // processPreview();
            modalInstance.show();
        } else {
            modalInstance.hide();
        }
    }
});

// 用來儲存選取的檔案
const selectedFile = ref(null);
const filePreviewUrl = ref(null);

const isImage = ref(false);
const isPDF = ref(false);

// 當檔案變更時觸發
const onFileChange = (event) => {
    const file = event.target.files[0];
    resetPreviewState()
    if (file) {
        selectedFile.value = file;   
        
        // 如果是圖片檔案，建立預覽 URL
        if (file.type.startsWith('image/')) {
            isImage.value = true
            filePreviewUrl.value = URL.createObjectURL(file);
        } else if (file.type === "application/pdf") {
            isPDF.value = true;
            filePreviewUrl.value = URL.createObjectURL(file);
        } else {
            filePreviewUrl.value = null;
        }
    } else {
        selectedFile.value = null;
        filePreviewUrl.value = null;
    }
};

const resetPreviewState = () => {
  selectedFile.value = null;
  filePreviewUrl.value = null;
  isImage.value = false;
  isPDF.value = false;
};

// 上傳檔案
const uploadFile = (rec) => {
    if (selectedFile.value) {
        const formData = new FormData();
        // 解決中文檔案名稱亂碼問題
        const renamedFile = new File(
            [selectedFile.value],
            encodeURIComponent(selectedFile.value.name),
            { type: selectedFile.value.type }
        );

        formData.append('uploadFile', renamedFile);

        fetch(`${BE_API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.status === 400) {
                throw new Error("檔案大小超過 5 MB");
            } else if (!response.ok) {
                throw new Error("檔案上傳失敗");
            }
            return response.json();
        })
        .then(data => {
            if (rec === 'single') {
                store.clientSocket.emit('request transfer', {
                    roomToken: store.roomToken,
                    fileId: data.fileId,
                    receiverID: props.receiverID,
                });
                alertStore.addAlert('檔案傳送成功～', 'info');
            } else if (rec === 'room') {
                fetch(`${BE_API_BASE_URL}/${store.user.id}/download/staging-area/${data.fileId}?type=room&id=${store.roomToken}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Fail calling api to save to s3");
                    }
                    return response.json();
                }).catch(error => {
                    alertStore.addAlert(error.message, 'error');
                });

                store.clientSocket.emit('request transfer', {
                    roomToken: store.roomToken,
                    fileId: data.fileId,
                });

                alertStore.addAlert('檔案傳送成功～', 'info');
            }
        })
        .catch(error => {
            alertStore.addAlert(error.message, 'error');
        });
    } else {
        alertStore.addAlert('請先選擇檔案', 'error');
    }
};

// 傳送檔案
const sendFile = () => {
    uploadFile('single')
    closeModal();
};

// 傳送檔案到 room
const sendFileToRoom = () => {
    uploadFile('room')
    closeModal();
};

onMounted(() => {
    const modalElement = document.getElementById('uploadModal');
    if (modalElement) {
        modalInstance = new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
    }
});

</script>

<template>
    <div class="modal fade" id="uploadModal" tabindex="-1" aria-labelledby="uploadModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content p-2">
                <div class="modal-header pt-3 pb-2 border-0">
                    <h5 class="modal-title" id="uploadModalLabel">請選擇要傳送的檔案</h5>
                </div>
                <div class="modal-body d-flex flex-column">
                    <!-- 檔案選擇器 -->
                    <input 
                        type="file" 
                        class="form-control mb-3" 
                        @change="onFileChange"
                    />
                    <!-- 預覽檔案名稱與影像 -->
                    <div v-if="selectedFile" class="file-preview">
                        <!-- image -->
                        <div v-if="isImage" class="image-preview mt-2">
                            <img :src="filePreviewUrl" alt="檔案預覽" class="img-fluid" />
                        </div>
                        <!-- PDF 檔案 -->
                        <div v-else-if="isPDF">
                            <iframe :src="filePreviewUrl"></iframe>
                        </div>
                        <div v-else>
                            <p>該檔案目前無法預覽，會持續開發的！</p>
                        </div>
                    </div>
                    <div v-else class="file-preview text-muted">
                        <p>尚未選擇檔案</p>
                    </div>
                </div>
                <div class="modal-footer justify-content-center border-0">
                    <button class="btn btn-secondary" type="button" @click="closeModal">取消</button>
                    <!-- 傳送按鈕 -->
                    <button class="btn btn-success" type="button" @click="sendFile">傳送</button>
                    <!-- 傳送到 room 的按鈕 -->
                    <button class="btn btn-primary" type="button" @click="sendFileToRoom">傳送到 room</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
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
</style>
