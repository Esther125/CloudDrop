import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAlertStore = defineStore('alert', () => {
    const alerts = ref([]); // 存儲所有的 alert

    // 添加一個新的 alert
    const addAlert = (message, level = 'info') => {
        const id = Date.now(); // 用唯一 ID 標識
        alerts.value.push({ id, message, level });

        // 自動移除
        setTimeout(() => removeAlert(id), 1500);
    };

    // 移除一個 alert
    const removeAlert = (id) => {
        alerts.value = alerts.value.filter((alert) => alert.id !== id);
    };

    return { alerts, addAlert, removeAlert };
});
