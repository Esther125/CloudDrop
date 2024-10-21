<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

defineProps({
  msg: {
    type: String,
    required: true
  }
})

const message = ref('');
const status = ref('');

const fetchGreeting = async () => {
  console.log("fetchGreeting~")
  try {
    const response = await axios.get("http://localhost:3000/api/v1/sample/greet");
    status.value = response.status;
    message.value = response.data;
  } catch (error) {
    console.error("Error fetching greeting:", error);
  }
};

onMounted(fetchGreeting);
</script>

<template>
  <div class="greetings">
    <h1 class="green">{{ msg }}</h1>
    <div>
      <h3>Greeting from Backend API:</h3>
      <p>Response Status: {{ status }}</p>
      <p>Response Body: {{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
  color: white;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
