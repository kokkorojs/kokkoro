<script setup lang="ts">
  import { computed } from 'vue';

  interface Props {
    qq: string;
  }

  const props = defineProps<Props>();
  const avatarUrl = computed(() => `https://q1.qlogo.cn/g?b=qq&nk=${props.qq}&s=100`);
</script>

<template>
  <img class="chat-avatar" :src="avatarUrl" alt="" width="40" height="40" loading="lazy" />
</template>

<style scoped lang="scss">
  .chat-avatar {
    display: block;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 50%;
    object-fit: cover;
  }
</style>
