<script setup lang="ts">
  import { computed, onUnmounted, shallowRef } from 'vue';

  import { type Plugin } from './PluginMarket.vue';

  const props = defineProps<Plugin>();

  const downloadFormatter = new Intl.NumberFormat('zh-CN');
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const maintainerNames = computed(() => props.maintainers.map(({ username }) => username).join(', '));
  const primaryMaintainerName = computed(() => {
    const [maintainer] = props.maintainers;
    return maintainer?.username;
  });
  const installCommand = computed(() => `bun add ${props.name}`);
  const formattedUpdatedAt = computed(() => dateFormatter.format(new Date(props.updatedAt)));
  const isCopied = shallowRef(false);

  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const copyInstallCommand = async () => {
    await navigator.clipboard.writeText(installCommand.value);
    isCopied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  };

  onUnmounted(() => clearTimeout(copyTimer));
</script>

<template>
  <article class="plugin-card">
    <header class="header">
      <div class="title">
        <h2 class="name">
          <a class="link" :href="props.links.npm" target="_blank" rel="noopener">{{ props.name }}</a>
        </h2>
        <span class="version">v{{ props.version }}</span>
      </div>
      <span :class="['compatibility', { compatible: props.isCompatible }]">
        {{ props.isCompatible ? '支持 v3' : '尚未适配 v3' }}
      </span>
    </header>

    <p class="description">{{ props.description || '暂无简介' }}</p>

    <footer class="details">
      <div class="maintainers">
        <img
          class="avatar"
          :src="props.avatar"
          :alt="primaryMaintainerName ? `${primaryMaintainerName} 的头像` : 'Kokkoro'"
          width="28"
          height="28"
          loading="lazy"
        />
        <span>{{ maintainerNames }}</span>
      </div>

      <div class="metrics">
        <span>{{ downloadFormatter.format(props.downloads) }} 次下载</span>
        <time :datetime="props.updatedAt">更新于 {{ formattedUpdatedAt }}</time>
      </div>
    </footer>

    <div class="install">
      <code>{{ installCommand }}</code>
      <button
        class="copy"
        type="button"
        :aria-label="isCopied ? '安装命令已复制' : '复制安装命令'"
        :title="isCopied ? '已复制' : '复制安装命令'"
        aria-live="polite"
        @click="copyInstallCommand"
      >
        <svg v-if="isCopied" aria-hidden="true" viewBox="0 0 24 24">
          <path d="m5 12 4 4L19 6" />
        </svg>
        <svg v-else aria-hidden="true" viewBox="0 0 24 24">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
  .plugin-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 250px;
    padding: 22px;
    border: 1px solid var(--vp-c-bg-soft);
    border-radius: 12px;
    background: var(--vp-c-bg-soft);
    flex-direction: column;
    transition:
      border-color 0.25s,
      background-color 0.25s;

    &:hover {
      border-color: var(--vp-c-brand-1);
    }

    .header {
      display: grid;
      min-width: 0;
      align-items: start;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
    }

    .title {
      display: flex;
      overflow: hidden;
      min-width: 0;
      align-items: baseline;
      gap: 8px;
    }

    .name {
      display: -webkit-box;
      overflow: hidden;
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      border: 0;
      font-size: 16px;
      letter-spacing: -0.015em;
      line-height: 24px;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .version {
      color: var(--vp-c-text-2);
      font-size: 12px;
      white-space: nowrap;
    }

    .link {
      color: var(--vp-c-text-1);
      text-decoration: none;

      &::after {
        position: absolute;
        inset: 0;
        border-radius: 12px;
        content: '';
      }

      &:focus-visible {
        outline: none;

        &::after {
          outline: 2px solid var(--vp-c-brand-1);
          outline-offset: 2px;
        }
      }
    }

    .compatibility {
      padding: 0 10px;
      border: 1px solid var(--vp-badge-warning-border);
      border-radius: 12px;
      background: var(--vp-badge-warning-bg);
      color: var(--vp-badge-warning-text);
      font-size: 12px;
      font-weight: 500;
      line-height: 22px;
      white-space: nowrap;

      &.compatible {
        background: var(--vp-c-success-soft);
        color: var(--vp-c-success-1);
      }
    }

    .description {
      display: -webkit-box;
      overflow: hidden;
      min-height: 48px;
      margin: 12px 0 0;
      color: var(--vp-c-text-2);
      font-size: 14px;
      line-height: 24px;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .details {
      display: flex;
      margin-top: auto;
      padding-top: 20px;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .maintainers {
      display: flex;
      overflow: hidden;
      min-width: 0;
      align-items: center;
      color: var(--vp-c-text-2);
      font-size: 13px;
      font-weight: 500;
      gap: 8px;

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .metrics {
      display: flex;
      color: var(--vp-c-text-2);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      line-height: 1.5;
      text-align: right;
      white-space: nowrap;
      flex: 0 0 auto;
      flex-direction: column;
      gap: 2px;
    }

    .avatar {
      width: 28px;
      height: 28px;
      border: 1px solid var(--vp-c-divider);
      border-radius: 50%;
      background: url('/22876424_p0.jpg') center / cover;
      flex: 0 0 auto;
      object-fit: cover;
    }

    .install {
      position: relative;
      z-index: 1;
      display: flex;
      margin-top: 14px;
      padding: 4px 4px 4px 13px;
      border-radius: 8px;
      background: var(--vp-c-bg);
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      code {
        overflow: hidden;
        min-width: 0;
        padding: 0;
        background: transparent;
        color: var(--vp-c-text-2);
        font-size: var(--vp-code-font-size);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .copy {
      display: grid;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 0;
      border-radius: 4px;
      background: transparent;
      color: var(--vp-c-text-3);
      cursor: pointer;
      flex: 0 0 auto;
      place-items: center;
      transition:
        background 0.2s,
        color 0.2s;

      &:hover {
        background: var(--vp-c-brand-soft);
        color: var(--vp-c-brand-1);
      }

      &:focus-visible {
        outline: 2px solid var(--vp-c-brand-1);
        outline-offset: 1px;
      }

      svg {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }
    }
  }
</style>
