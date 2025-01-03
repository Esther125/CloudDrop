<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useGlobalStore } from '../stores/globals.js';
import axios from 'axios';

const store = useGlobalStore();
const apiUrl = import.meta.env.VITE_BE_API_BASE_URL;

const userID = store.user.id;
// const userID = 'a';
const totalTransferCount = ref(-1);
const records = reactive([]);
const prevLastKey = ref(null);

const recordsContainer = ref(null);
const currentCount = ref(0);

onMounted(async () => {
    await getNextRecords(null);
    // check next round is needed
    await nextTick();
    while (_checkNotEnoughRecords() && prevLastKey.value !== null) {
        await getNextRecords(prevLastKey.value);
    }

    // setup scoll handler
    const container = recordsContainer.value;
    container.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
    unhandleScroll();
});

// ----- get records -----
const getNextRecords = async (lastKey) => {
    console.log('Get new records');
    try {
        const { data } = await axios.get(`${apiUrl}/history`, { params: { userID, lastKey } });
        if (data) {
            totalTransferCount.value = data.totalTransferCount;
            data.items.forEach((item) => {
                currentCount.value++;
                let transferType = '';
                if (item.sender.identifier == userID) {
                    transferType = 'send';
                } else if (item.receiver.identifier == userID) {
                    transferType = 'receive';
                }
                records.push({ ...{ type: transferType, index: currentCount.value, ...item } });
            });
            prevLastKey.value = data.lastKey;
            console.log(`Current records count: ${records.length}`);
        }
    } catch {
        console.log('Error getting new records');
    }
};

// 判斷甚麼時候需要再抓下一頁資料
const isHandling = ref(false);
const handleScroll = async () => {
    const container = recordsContainer.value;
    if (isHandling.value === false && _checkNotEnoughRecords()) {
        isHandling.value = true;

        const lastKey = prevLastKey.value;
        if (lastKey === null) {
            unhandleScroll();
            stopWatchHeight();
            return;
        }
        await getNextRecords(lastKey);
        isHandling.value = false;
    }
};

const unhandleScroll = () => {
    const container = recordsContainer.value;
    if (container) {
        container.removeEventListener('scroll', handleScroll);
    }
};

const _checkNotEnoughRecords = () => {
    const container = recordsContainer.value;
    return container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
};

// ----- filter setup ------
const filter = ref('all');
const filterOptions = {
    all: {
        filter: 'all',
        label: '全部',
        icon: 'bi bi-send',
    },
    send: {
        filter: 'send',
        label: '寄出',
        icon: 'bi bi-file-arrow-up',
    },
    receive: {
        filter: 'receive',
        label: '接收',
        icon: 'bi bi-file-arrow-up',
    },
};
const filterRecords = computed(() => {
    if (filter.value === 'all') {
        return records;
    } else {
        return records.filter((record) => record.type === filter.value);
    }
});

const filterHandler = (option) => {
    if (Object.keys(filterOptions).includes(option)) {
        filter.value = option;
    }
};

const stopWatchHeight = watch(filterRecords, async () => {
    await nextTick();

    const container = recordsContainer.value;
    if (prevLastKey.value !== null && container.scrollHeight === container.clientHeight) {
        handleScroll();
    }
});
</script>

<template>
    <div class="container-fluid d-flex flex-column m-0 py-0 px-1 px-sm-5 h-100 w-100" style="max-width: 100vw">
        <h2 class="m-0 pt-3 pb-0 ps-2">歷史紀錄</h2>
        <div class="d-flex gap-3 justify-content-center my-2 p-2">
            <!-- filter button -->
            <button
                v-for="option in filterOptions"
                :key="option.filter"
                :class="[
                    'btn d-inline-flex justify-content-center align-items-center gap-2 py-1 flex-fill',
                    filter === option.filter ? 'btn-primary' : 'btn-outline-secondary',
                ]"
                type="button"
                @click="filter === option.filter ? null : filterHandler(option.filter)"
            >
                <span>{{ option.label }}</span>
                <i :class="option.icon"></i>
            </button>
        </div>

        <div class="flex-fill px-2" style="overflow-y: scroll; max-height: calc(100vh - 245px)" ref="recordsContainer">
            <!-- records -->
            <div
                v-if="totalTransferCount > 0"
                v-for="record in filterRecords"
                :key="`${filter}-${record.index}`"
                class="record-card w-100 my-2 d-flex align-items-center py-1 rounded"
            >
                <div class="mx-3" style="width: 30px;">{{ record.index }}</div>
                <i :class="$getFileIcon(Array(...record.fileNames)[0])" class="mx-2 h1"></i>
                <div class="vr my-2"></div>
                <div class="w-100 mx-3" style="overflow: hidden">
                    <div class="fw-bold text-break">
                        {{ Array(...record.fileNames)[0] }}
                    </div>
                    <div v-if="record.receiver.identifier == userID" class="mt-1 mb-2 d-flex align-items-center gap-2">
                        <span
                            class="badge bg-primary-subtle border border-primary-subtle text-primary-emphasis rounded-pill"
                            style="min-width: 4.5em"
                            >FROM</span
                        >
                        <i v-if="record.sender.type === 'USER'" class="bi bi-person-check-fill" style="font-size: 1rem">
                        </i>
                        <i v-else-if="record.sender.type === 'ROOM'" class="bi bi-people-fill" style="font-size: 1rem">
                        </i>
                        <i v-else class="bi bi-person-x" style="font-size: 1rem"> </i>
                        <span>{{ record.sender.name }}</span>
                    </div>
                    <div v-if="record.sender.identifier == userID" class="mt-1 mb-2 d-flex align-items-center gap-2">
                        <span
                            class="badge bg-danger-subtle border border-danger-subtle text-danger-emphasis rounded-pill"
                            style="min-width: 4.5em"
                            >TO</span
                        >
                        <i
                            v-if="record.receiver.type === 'USER'"
                            class="bi bi-person-check-fill"
                            style="font-size: 1rem"
                        >
                        </i>
                        <i
                            v-else-if="record.receiver.type === 'ROOM'"
                            class="bi bi-people-fill"
                            style="font-size: 1rem"
                        >
                        </i>
                        <i v-else class="bi bi-person-x" style="font-size: 1rem"> </i>
                        <span>{{ record.receiver.name }}</span>
                    </div>
                </div>
                <div class="vr my-2"></div>
                <div class="mx-2 text-center" style="white-space: normal; word-break: keep-all;" overflow-wrap="normal">
                    <small>{{ new Date(record.timestamp).toLocaleString() }}</small>
                </div>
            </div>
            <div class="text-center" v-else-if="totalTransferCount == 0">無傳輸紀錄</div>
        </div>
    </div>
</template>

<style scoped>
.record-card {
    background-color: var(--color-background-mute);
}

.btn-outline-secondary:hover {
    background-color: inherit;
    color: inherit;
    border-color: inherit;
}

/* 整個滾動條 */
::-webkit-scrollbar {
    width: 12px;
    height: 12px;
}

/* 滾動條的滑塊部分 */
::-webkit-scrollbar-thumb {
    background: var(--color-text);
    border-radius: 6px;
}

/* 滾動條的軌道部分 */
::-webkit-scrollbar-track {
    background: var(--color-background-mute);
    border-radius: 6px;
}
</style>
