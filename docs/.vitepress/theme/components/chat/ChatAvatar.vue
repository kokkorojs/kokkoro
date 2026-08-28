<script setup lang="ts">
  import { computed } from 'vue';

  interface Props {
    qq: string;
  }

  const props = defineProps<Props>();
  const url = computed(() => `https://q1.qlogo.cn/g?b=qq&nk=${props.qq}&s=100`);
</script>

<template>
  <div class="chat-avatar">
    <img class="image" :src="url" alt="" />
  </div>
</template>

<style scoped lang="scss">
  .chat-avatar {
    display: inline-block;

    .image {
      display: inline-flex;
      width: 2.5rem;
      height: 2.5rem;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: white;
      line-height: 0;
    }
  }
</style>
