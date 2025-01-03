<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useGlobalStore } from '../stores/globals.js';
import axios from 'axios';

const store = useGlobalStore();
const apiUrl = import.meta.env.VITE_BE_API_BASE_URL;

const userID = store.user.id;
// const userID = '12346';
const totalFilesCount = ref(-1);
const tempFiles = reactive([]);
const prevLastKey = ref(null);

const tempFilesContainer = ref(null);
const currentCount = ref(0);

onMounted(async () => {
    await getNextTempFiles(null);
    await nextTick();

    if (totalFilesCount.value > 0 && _checkNotEnoughFiles() && prevLastKey.value !== "undefined") {
      await getNextTempFiles(prevLastKey.value);
    }

    const container = tempFilesContainer.value;
    if (totalFilesCount.value > 0) {
        container.addEventListener('scroll', handleScroll);
    }
});

onUnmounted(() => {
    unhandleScroll();
});

// 取暫存區資料
const getNextTempFiles = async (lastKey) => {
    console.log('Get new TempFiles');

    try {
        const { data } = await axios.get(`${apiUrl}/staging-area`, {
            params: {
                id: userID,
                type: 'user',
                ...(lastKey ? { lastKey: decodeURIComponent(lastKey) } : {}),
            },
        });

        if (data && Array.isArray(data.file) && data.file.length > 0) {
            totalFilesCount.value = data.totalFilesCount;

            const DEFAULT_VALIDITY_DAYS = 30;

            data.file.forEach((item) => {
                currentCount.value++;

                // 計算剩下天數
                const modifiedDate = new Date(item.lastModified);
                const expiryDate = new Date(modifiedDate.getTime() + DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000); // 設置有效期
                const today = new Date();
                const daysLeft = Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))); 

                tempFiles.push({ index: currentCount.value, daysLeft, ...item });
            });

            prevLastKey.value = data.lastKey || null;
            if (!prevLastKey.value) {
                console.log('No more pages to load');
                unhandleScroll();
            }
        } else if (data.totalFilesCount === 0) {
            // 沒有檔案
            handleNoFiles();
        } else {
            console.log('unexpected API response:', data);
            prevLastKey.value = null;
        }
    } catch(error) {
        console.error('Error getting new TempFiles:', error);
    }
};

// 判斷是否需抓下頁資料
const isHandling = ref(false);
const handleScroll = async () => {
    const container = tempFilesContainer.value;

    // 判斷是否需要下一頁
    if (!isHandling.value && _checkNotEnoughFiles() && prevLastKey.value !== null) {
        isHandling.value = true;

        try {
            const lastKey = prevLastKey.value;

            if (!lastKey || lastKey === "undefined") {
                console.log('No more pages to load');
                unhandleScroll();
                return;
            }

            console.log('Loading next page');
            await getNextTempFiles(lastKey);
        } catch (error) {
            console.error('Error loading next page:', error);
        } finally {
            isHandling.value = false;
        }
    }  
};

const unhandleScroll = () => {
    const container = tempFilesContainer.value;
    if (container) {
        console.log('Removing scroll event listener'); 
        container.removeEventListener('scroll', handleScroll);
    }
};

const handleNoFiles = () => {
    totalFilesCount.value = 0;
    prevLastKey.value = null;
    tempFiles.length = 0;
    console.log('No files found.');
};

const _checkNotEnoughFiles = () => {
    const container = tempFilesContainer.value;
    if (!container || totalFilesCount.value <= 0) return false;

    return container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
};

// ---- download preSigned URL ----
const isDownloading = ref(false);

const downloadFile = async (originalName) => {
    if (isDownloading.value) return;
    isDownloading.value = true;

    try {
        const { data } = await axios.get(`${apiUrl}/staging-area/download`, {
            params: {
                userId: userID,
                filename: originalName
            },
        });
        if (data.url) {
            window.open(data.url, '_parent');
        }
    } catch (error) {
        console.error('Error downloading file:', originalName, error);
    } finally {
        isDownloading.value = false;
    }
};
</script>

<template>
    <div class="container-fluid d-flex flex-column m-0 py-0 px-1 px-sm-5 h-100 w-100" style="max-width: 100vw">
        <h2 class="m-0 pt-3 pb-0 mb-2 ps-2">檔案暫存區</h2>
        <div 
            class="flex-fill px-2" 
            style="overflow-y: scroll; max-height: calc(100vh - 185px)" 
            ref="tempFilesContainer"
        >
        <!-- 檔案清單 -->
        <div
            v-if="totalFilesCount > 0"
            v-for="file in tempFiles"
            :key="`file-${file.index}`"
            class="file-card w-100 my-2 d-flex align-items-center py-1 rounded"
        >
            <div class="mx-3" style="width: 30px;">{{ file.index }}</div>
            <i :class="$getFileIcon(file.filename)" class="mx-2 h1"></i>
            <div class="vr my-2"></div>
            <div class="w-100 mx-3" style="overflow: hidden">
                <!-- 檔名 -->
                <div class="fw-bold text-break">
                    {{ file.filename }}
                </div>
                <!-- 剩餘天數 -->
                <div class="mt-1 mb-2 d-flex align-items-center gap-2">
                    <!-- 檔案大小 -->
                    <span 
                        class="text-secondary" 
                        style="flex-shrink: 0; text-align: left; white-space: nowrap;"
                    >
                        {{ file.size }}
                    </span>
                    
                    <div class="d-flex align-items-center justify-content-end gap-2 ms-auto">
                        <span
                            class="badge bg-success-subtle border border-success-subtle text-success-emphasis rounded-pill hide-as-phone"
                        >
                            還剩
                        </span>
                        <i class="bi bi-hourglass-split" style="font-size: 1rem"></i>
                        <span>{{ file.daysLeft }} 天</span>
                    </div>
                </div>
            </div>
            <div class="vr my-2"></div>
            <!-- 下載按鈕 -->
            <div class="mx-2 text-center">
                <button 
                    :disable="isDownloading"
                    class="btn btn-primary w-100 custom-min-width"
                    @click="downloadFile(file.originalName)"
                >
                <i class="bi bi-download"></i> <span class="hide-as-phone">下載</span>
                </button>
            </div>
        </div>
        <div class="text-center" v-else-if="totalFilesCount === 0">暫無檔案</div>
    </div>
    </div>
</template>

<style scoped>
.file-card {
    background-color: var(--color-background-mute);
}

.btn-outline-secondary:hover {
    background-color: inherit;
    color: inherit;
    border-color: inherit;
}

/* 滾動條樣式 */
::-webkit-scrollbar {
    width: 12px;
    height: 12px;
}

::-webkit-scrollbar-thumb {
    background: var(--color-text);
    border-radius: 6px;
}

::-webkit-scrollbar-track {
    background: var(--color-background-mute);
    border-radius: 6px;
}
</style>
