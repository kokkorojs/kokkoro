<script setup lang="ts">
  import { provide } from 'vue';

  interface Props {
    self: string;
    title?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    title: '聊天记录',
  });

  provide('chat-self', props.self);
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
    <div class="messages">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
  .chat-panel {
    --text_primary: light-dark(#000, rgb(255 255 255 / 90%));
    --text_secondary_01: light-dark(#999, #808080);
    --text_link: #2d77e5;
    --bubble_host: light-dark(#ccebff, #666);
    --bubble_guest: light-dark(#fff, #262626);
    --on_bubble_host_text: light-dark(#000, #fff);
    --bubble_guest_text: light-dark(#000, #f2f2f2);

    margin: 24px auto;
    overflow: hidden;
    border-radius: 8px;
    background: var(--vp-code-block-bg);
    color: var(--text_primary);
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;

    .titlebar {
      position: relative;
      display: flex;
      height: 48px;
      align-items: center;
      justify-content: center;
      background: var(--vp-code-tab-bg);
      backdrop-filter: saturate(180%) blur(20px);
      box-shadow: inset 0 -1px var(--vp-code-tab-divider);
    }

    .window-controls {
      position: absolute;
      top: 50%;
      left: 9px;
      display: flex;
      gap: 9px;
      transform: translateY(-50%);
    }

    .window-control {
      width: 14px;
      height: 14px;
      border: 1px solid rgb(0 0 0 / 14%);
      border-radius: 50%;
      box-shadow: inset 0 0 0 0.5px rgb(255 255 255 / 16%);

      &.close {
        background: #ff5f57;
      }

      &.minimize {
        background: #febc2e;
      }

      &.zoom {
        background: #28c840;
      }
    }

    .title {
      max-width: calc(100% - 160px);
      overflow: hidden;
      font-size: 13px;
      font-weight: 600;
      line-height: 48px;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .messages {
      padding: 4px 20px 20px;
    }

    @media (width <= 640px) {
      .messages {
        padding-inline: 12px;
      }
    }
  }
</style>
