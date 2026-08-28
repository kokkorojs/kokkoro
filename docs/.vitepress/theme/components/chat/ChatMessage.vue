<script setup lang="ts">
  import { computed, inject, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';

  import ChatAvatar from './ChatAvatar.vue';

  interface Props {
    at?: string;
    qq: string;
    nickname: string;
  }

  const props = defineProps<Props>();
  const self = inject<string>('chat-self');

  if (!self) {
    throw new Error('ChatMessage 必须在 ChatPanel 中使用');
  }

  const isSelf = computed(() => props.qq === self);
  const message = useTemplateRef<HTMLDivElement>('message');
  const isVisible = shallowRef(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    const element = message.value;

    if (!element) {
      return;
    }
    observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) {
        return;
      }
      isVisible.value = true;
      observer?.disconnect();
    });
    observer.observe(element);
  });

  onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div ref="message" class="chat-message" :class="{ self: isSelf, visible: isVisible }">
    <ChatAvatar :qq="props.qq" />
    <div class="message">
      <div class="nickname">{{ props.nickname }}</div>
      <div class="bubble">
        <span v-if="props.at" class="mention">@{{ props.at }}&nbsp;</span>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .chat-message {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 16px;
    opacity: 0;
    transform: translateX(-10%);
    transition:
      transform 0.4s ease-out,
      opacity 0.4s ease-in;

    &.self {
      flex-direction: row-reverse;
      transform: translateX(10%);

      .message {
        align-items: flex-end;
      }

      .nickname {
        text-align: right;
      }

      .bubble {
        background: var(--bubble_host);
        color: var(--on_bubble_host_text);
      }

      .mention {
        color: inherit;
      }
    }

    &.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .message {
      display: flex;
      min-width: 0;
      max-width: min(72%, calc(100% - 48px));
      flex-direction: column;
      align-items: flex-start;
    }

    .nickname {
      max-width: 100%;
      margin-bottom: 4px;
      overflow: hidden;
      color: var(--text_secondary_01);
      font-size: 12px;
      line-height: 18px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bubble {
      max-width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--bubble_guest);
      color: var(--bubble_guest_text);
      font-size: 14px;
      line-height: 22px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;

      :deep(img) {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        vertical-align: middle;
      }
    }

    .mention {
      color: var(--text_link);
    }

    @media (width <= 640px) {
      .message {
        max-width: min(82%, calc(100% - 48px));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
</style>
