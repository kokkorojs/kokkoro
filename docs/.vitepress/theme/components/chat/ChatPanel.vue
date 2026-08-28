<script setup lang="ts">
  interface Props {
    controls?: boolean;
    title?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    controls: true,
    title: '聊天记录',
  });
</script>

<template>
  <div class="chat-panel">
    <div v-if="props.controls" class="controls">
      <div class="circle red" />
      <div class="circle yellow" />
      <div class="circle green" />
      <div class="title">{{ props.title }}</div>
    </div>
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
  .chat-panel {
    position: relative;
    margin: 1rem auto;
    padding: 0.3rem 0;
    overflow: hidden;
    border-radius: 0.5rem;
    background-color: var(--vp-c-bg-alt);

    .controls {
      display: initial;
      width: 100%;
      padding: 0.5rem;
    }

    .circle {
      display: inline-block;
      width: 0.8rem;
      height: 0.8rem;
      margin: 0.5rem 0 0.5rem 0.2rem;
      border-radius: 50%;

      &.red {
        background-color: #ff5f56;
      }

      &.yellow {
        background-color: #ffbd2e;
      }

      &.green {
        background-color: #27c93f;
      }
    }

    .title {
      position: absolute;
      top: 0.8rem;
      width: 100%;
      font-size: 0.8rem;
      line-height: 1rem;
      text-align: center;
    }

    .content {
      padding: 0 1rem;
    }
  }
</style>
