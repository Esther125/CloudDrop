<template>
    <div class="toast-container">
        <div 
            v-if="alerts.length !== 0"
            :class="[alerts[0].level]"
            class="p-2 rounded"
        >
            {{ alerts[0].message }}
        </div>

        <!-- <div
        v-for="alert in alerts"
        :key="alert.id"
        :class="['toast', alert.level]"
      >
        {{ alert.message }}
      </div> -->
    </div>
</template>

<script>
import { useAlertStore } from '@/stores/alertStore';
import { computed } from 'vue';

export default {
    setup() {
        const alertStore = useAlertStore();
        const alerts = computed(() => alertStore.alerts);

        return { alerts };
    },
};
</script>

<style scoped>
.toast-container {
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.info {
    color: white;
    text-align: center;
    animation: fadeOut 5s forwards;
    background-color: #198754;
}

.error {
    color: white;
    text-align: center;
    animation: fadeOut 5s forwards;
    background-color: #dc3545;
}

.warn {
    color: white;
    text-align: center;
    animation: fadeOut 5s forwards;
    background-color: #0097A7;
}

@keyframes fadeOut {
    0% {
        opacity: 1;
    }
    80% {
        opacity: 0.8;
    }
    100% {
        opacity: 0;
        visibility: hidden;
    }
}
</style>
