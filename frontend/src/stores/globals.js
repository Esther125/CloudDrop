import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGlobalStore = defineStore('global', () => {
    const user = ref({
        id: '',
    });
    const roomToken = ref();
    const qrCodeSrc = ref();
    const members = ref([]);
    const clientSocket = ref(null);

    return { user, roomToken, qrCodeSrc, members, clientSocket };
});
