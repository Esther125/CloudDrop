<script setup>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useGlobalStore } from '@/stores/globals.js';
import { useAlertStore } from '@/stores/alertStore';

const BE_API_BASE_URL = import.meta.env.VITE_BE_API_BASE_URL;
const store = useGlobalStore();
const alertStore = useAlertStore();

const props = defineProps({
    showDownloadModal: Boolean,
    fileId: String
})

// const testFileId = ref("9fb9259a-3e76-4fae-8a6f-b35cebf308c7")

let modalInstance = null;

const filePreviewUrl = ref(null);
const filename = ref();
const isImage = ref(false);
const isPDF = ref(false);

// 定義 emits
const emit = defineEmits(['update:showDownloadModal']);

// 關閉 modal 的函式
const closeModal = () => {
    emit('update:showDownloadModal', false);
};

const processPreview = async () => {
    try {
        const response = await axios.get(`${BE_API_BASE_URL}/${store.user.id}/download/local/${props.fileId}`, {
            responseType: 'blob'
        });

        if (response.status === 200) {
            const contentDisposition = response.headers['content-disposition'];
            let tempFilename = 'downloaded-file';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) {
                    tempFilename = decodeURIComponent(filenameMatch[1]);
                }
            }

            // 處理檔名（將 id 去掉）
            filename.value = tempFilename.split('_').pop()

            // 創建 Blob URL
            filePreviewUrl.value = URL.createObjectURL(response.data);

            // 判斷檔案副檔名
            const extension = filename.value.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
                isImage.value = true;
            } else if (['pdf'].includes(extension)) {
                isPDF.value = true;
            }
        }
    } catch (error) {
        console.error('Error processing the file:', error);
    }
}

const download = () => {
    try {
        // 創建下載鏈接
        const a = document.createElement('a');
        a.href = filePreviewUrl.value;
        a.download = filename.value; // 設置下載文件名
        a.style.display = 'none';

        // 模擬點擊觸發下載
        document.body.appendChild(a);
        a.click();

        // 清理資源
        document.body.removeChild(a);
        URL.revokeObjectURL(filePreviewUrl.value); // 釋放 Blob URL
    } catch (error) {
        console.error('Error downloading file:', error);
    }
    closeModal()
}

const sendToS3 = async () => {
    try {
        const requestPath = `${BE_API_BASE_URL}/${store.user.id}/download/staging-area/${props.fileId}?type=user&id=${store.user.id}`
        const response = await axios.get(requestPath);

        if (response.status === 200) {
            alertStore.addAlert('儲存成功～ 可以前往個人暫存區查看', 'info');
        } else {
            alertStore.addAlert('發生了一些問題，可以再嘗試看看，不好意思 ><', 'info');
        }
    } catch {
        alertStore.addAlert('發生了一些問題，可以再嘗試看看，不好意思 ><', 'info');
    } finally {
        closeModal();
    }
}

watch(() => props.showDownloadModal, (newVal) => {
    if (modalInstance) {
        if (newVal) {
            processPreview();
            modalInstance.show();
        } else {
            modalInstance.hide();
        }
    }
});

onMounted(() => {
    const modalElement = document.getElementById('downloadModal');
    if (modalElement) {
        modalInstance = new bootstrap.Modal(modalElement, { backdrop: 'static', keyboard: false });
    }
});
</script>

<template>
    <div class="modal fade" id="downloadModal" tabindex="-1" aria-labelledby="downloadModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content p-2">
                <div class="modal-header pt-3 pb-2 border-0">
                    <h5 class="modal-title" id="downloadModalLabel">檔案接收</h5>
                </div>
                <div class="modal-body d-flex flex-column">
                    <h6>{{ filename }}</h6>
                    <!-- 預覽檔案名稱與影像 -->
                    <div class="file-preview">
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
                </div>
                <div class="modal-footer justify-content-center border-0">
                    <!-- 取消 -->
                    <button class="btn btn-secondary" type="button" @click="closeModal">取消</button>
                    <!-- 下載按鈕 -->
                    <button class="btn btn-success" type="button" @click="download">下載</button>
                    <!-- 傳送到 s3 的按鈕 -->
                    <button v-if="store.loginStatus" class="btn btn-success" type="button" @click="sendToS3">儲存至暫存區</button>
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