<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useGlobalStore } from '../stores/globals.js';

import Home from '../components/Home.vue';
import Room from '../components/Room.vue';

const store = useGlobalStore();
const route = useRoute();

onMounted(() => {
  store.roomToken = route.query.roomToken;
});
</script>

<template>
  <component
      :is="route.query.roomToken ? Room : Home"
  />
</template>
