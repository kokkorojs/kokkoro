<script setup lang="ts">
  import { type ComputedRef, computed, inject, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';

  import ChatAvatar from './ChatAvatar.vue';
  import botLabelUrl from './robot-label.svg';

  interface Props {
    qq: string;
    nickname: string;
  }

  const props = defineProps<Props>();
  const self = inject<string>('chat-self');
  const bots = inject<ComputedRef<ReadonlySet<string>>>('chat-bots');

  if (!self || !bots) {
    throw new Error('ChatMessage 必须在 ChatPanel 中使用');
  }
  const isSelf = computed(() => props.qq === self);
  const isBot = computed(() => bots.value.has(props.qq));

  const message = useTemplateRef<HTMLDivElement>('message');
  const isVisible = shallowRef(false);
  const observer = shallowRef<IntersectionObserver>();

  onMounted(() => {
    const element = message.value;

    if (!element) {
      return;
    }
    observer.value = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) {
        return;
      }
      isVisible.value = true;

      observer.value?.disconnect();
    });
    observer.value.observe(element);
  });

  onUnmounted(() => observer.value?.disconnect());
</script>

<template>
  <div ref="message" class="message">
    <div
      class="message-container"
      :class="{ 'message-container--self': isSelf, 'message-container--align-right': isSelf }"
      :data-visible="isVisible || undefined"
    >
      <span class="avatar-span">
        <ChatAvatar :qq="props.qq" />
      </span>
      <div class="user-name">
        <span class="text-ellipsis">{{ props.nickname }}</span>
        <img v-if="isBot" class="bot-label" :src="botLabelUrl" alt="机器人" width="16" height="16" />
      </div>
      <div class="message-content__wrapper">
        <div class="msg-content-container" :class="isSelf ? 'container--self' : 'container--others'">
          <div class="message-content">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .message {
    margin-top: 16px;

    .message-container {
      display: grid;
      grid-template-areas:
        'avatar user-name'
        'avatar content';
      grid-template-columns: 32px minmax(0, 1fr);
      column-gap: 8px;
      row-gap: 4px;
      opacity: 0;
      transform: translateX(-10%);
      transition:
        transform 0.4s ease-out,
        opacity 0.4s ease-in;

      &[data-visible] {
        opacity: 1;
        transform: translateX(0);
      }

      &.message-container--self {
        grid-template-areas:
          'user-name avatar'
          'content avatar';
        grid-template-columns: minmax(0, 1fr) 32px;
        transform: translateX(10%);

        &[data-visible] {
          transform: translateX(0);
        }

        .user-name,
        .message-content__wrapper {
          justify-self: end;
        }

        .msg-content-container {
          background: var(--bubble_host);
          color: var(--on_bubble_host_text);
        }
      }
    }

    .avatar-span {
      display: block;
      grid-area: avatar;
    }

    .user-name {
      display: flex;
      grid-area: user-name;
      max-width: 100%;
      align-items: center;
      gap: 4px;
      color: var(--text_secondary_01);
      cursor: default;
      font-size: 12px;
      line-height: 18px;
    }

    .text-ellipsis {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .bot-label {
      display: block;
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      margin: 0;
    }

    .message-content__wrapper {
      width: fit-content;
      min-width: 0;
      max-width: min(72%, calc(100% - 40px));
      grid-area: content;
      justify-self: start;
    }

    .msg-content-container {
      overflow: hidden;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--bubble_guest);
      color: var(--bubble_guest_text);
    }

    .message-content {
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

    @media (width <= 640px) {
      .message-content__wrapper {
        max-width: min(82%, calc(100% - 40px));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .message-container {
        transition: none;
      }
    }
  }
</style>
