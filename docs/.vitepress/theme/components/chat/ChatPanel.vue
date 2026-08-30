<script setup lang="ts">
  import { computed, provide } from 'vue';

  interface Props {
    bots?: string[];
    self: string;
    title?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    bots: () => [],
    title: '聊天记录',
  });
  const bots = computed(() => new Set(props.bots));

  provide('chat-self', props.self);
  provide('chat-bots', bots);
</script>

<template>
  <div class="chat-panel">
    <div class="titlebar">
      <div class="window-controls" aria-hidden="true">
        <span class="window-control close" />
        <span class="window-control minimize" />
        <span class="window-control zoom" />
      </div>
      <div class="title">{{ props.title }}</div>
    </div>
    <div class="chat-msg-area">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
  .chat-panel {
    --bubble_host: #ccebff;
    --bubble_guest: #fff;
    --on_bubble_host_text: #000;
    --bubble_guest_text: #000;
    --text_secondary_01: #999;
    --text_link: #2d77e5;

    margin: 24px auto;
    overflow: hidden;
    border-radius: 8px;
    background: var(--vp-code-block-bg);

    .titlebar {
      position: relative;
      display: flex;
      height: 48px;
      align-items: center;
      justify-content: center;
      background-color: var(--vp-code-tab-bg);
      box-shadow: inset 0 -1px var(--vp-code-tab-divider);
    }

    .window-controls {
      position: absolute;
      top: 50%;
      left: 12px;
      display: flex;
      gap: 9px;
      transform: translateY(-50%);
    }

    .window-control {
      width: 14px;
      height: 14px;
      border-radius: 50%;

      &.close {
        background: #ff5c5f;
      }

      &.minimize {
        background: #fac800;
      }

      &.zoom {
        background: #35c759;
      }
    }

    .title {
      max-width: calc(100% - 160px);
      overflow: hidden;
      color: var(--vp-code-tab-text-color);
      cursor: default;
      font-family: var(--vp-font-family-base);
      font-size: 14px;
      font-weight: 500;
      line-height: 48px;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chat-msg-area {
      padding: 4px 20px 20px;
    }

    @media (width < 640px) {
      margin-inline: -24px;
      border-radius: 0;

      .chat-msg-area {
        padding-inline: 12px;
      }
    }
  }

  :global(.dark .chat-panel) {
    --bubble_host: #3b3b3b;
    --bubble_guest: #3b3b3b;
    --on_bubble_host_text: #fff;
    --bubble_guest_text: #f2f2f2;
    --text_secondary_01: #808080;
  }
</style>
