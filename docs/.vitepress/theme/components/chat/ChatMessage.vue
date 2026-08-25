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
const show = shallowRef(false);
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
    show.value = true;
    observer?.disconnect();
  });
  observer.observe(element);
});

onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div ref="message" class="chat-message" :class="{ show }">
    <ChatAvatar :qq="props.qq" />
    <div class="box">
      <div class="nickname">{{ props.nickname }}</div>
      <div class="text">
        <span v-if="props.at" class="at">@{{ props.at }}&nbsp;</span>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  position: relative;
  margin: 1rem 0;
  opacity: 0;
  transform: translateX(-10%);
  transition:
    transform 0.4s ease-out,
    opacity 0.4s ease-in;
}

.chat-message.show {
  opacity: 1;
  transform: translateX(0);
}

.box {
  display: inline-block;
  max-width: calc(100% - 3rem);
  margin-left: 0.5rem;
  vertical-align: top;
}

.nickname {
  color: gray;
  font-size: 0.8rem;
}

.text {
  position: relative;
  padding: 0.6rem 0.7rem;
  margin-top: 0.2rem;
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-all;
  background-color: var(--vp-c-bg);
  border-radius: 0.5rem;
  box-shadow: rgb(0 0 0 / 5%) 0 1px 2px;
}

.text :deep(img) {
  vertical-align: middle;
  border-radius: 0.5rem;
}

.at {
  color: #6495ed;
  cursor: pointer;
}
</style>
