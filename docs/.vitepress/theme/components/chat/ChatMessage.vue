<script setup lang="ts">
  import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';

  import ChatAvatar from './ChatAvatar.vue';

  interface Props {
    at?: string;
    qq: string;
    nickname: string;
  }

  const props = defineProps<Props>();
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
  <div ref="message" class="chat-message" :class="{ visible: isVisible }">
    <ChatAvatar :qq="props.qq" />
    <div class="body">
      <div class="nickname">{{ props.nickname }}</div>
      <div class="content">
        <span v-if="props.at" class="mention">@{{ props.at }}&nbsp;</span>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .chat-message {
    position: relative;
    margin: 1rem 0;
    opacity: 0;
    transform: translateX(-10%);
    transition:
      transform 0.4s ease-out,
      opacity 0.4s ease-in;

    &.visible {
      opacity: 1;
      transform: translateX(0);
    }

    .body {
      display: inline-block;
      max-width: calc(100% - 3rem);
      margin-left: 0.5rem;
      vertical-align: top;
    }

    .nickname {
      color: gray;
      font-size: 0.8rem;
    }

    .content {
      position: relative;
      margin-top: 0.2rem;
      padding: 0.6rem 0.7rem;
      border-radius: 0.5rem;
      background-color: var(--vp-c-bg);
      box-shadow: rgb(0 0 0 / 5%) 0 1px 2px;
      font-size: 0.9rem;
      white-space: pre-wrap;
      word-break: break-all;

      :deep(img) {
        border-radius: 0.5rem;
        vertical-align: middle;
      }
    }

    .mention {
      color: #6495ed;
      cursor: pointer;
    }
  }
</style>
