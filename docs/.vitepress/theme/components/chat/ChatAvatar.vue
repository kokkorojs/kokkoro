<script setup lang="ts">
  import { computed } from 'vue';

  interface Props {
    qq: string;
  }

  const props = defineProps<Props>();
  const avatarUrl = computed(() => `https://q1.qlogo.cn/g?b=qq&nk=${props.qq}&s=100`);
</script>

<template>
  <img class="message-container__avatar" :src="avatarUrl" alt="" width="32" height="32" loading="lazy" />
</template>

<style scoped lang="scss">
  .message-container__avatar {
    display: block;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    margin: 0;
    border-radius: 50%;
    object-fit: cover;
  }
</style>
