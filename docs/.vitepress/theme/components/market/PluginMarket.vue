<script setup lang="ts">
  import { computed, onMounted, shallowRef } from 'vue';

  import PluginCard from './PluginCard.vue';

  interface Maintainer {
    email?: string;
    username: string;
  }

  interface NpmPackageLinks {
    npm: string;
  }

  interface NpmSearchPackage {
    date: string;
    description?: string;
    keywords?: string[];
    links: NpmPackageLinks;
    maintainers: Maintainer[];
    name: string;
    version: string;
  }

  interface NpmSearchResult {
    package: NpmSearchPackage;
  }

  interface NpmSearchResponse {
    objects: NpmSearchResult[];
  }

  interface NpmDownloadPoint {
    downloads: number | null;
  }

  interface PackumentVersion {
    peerDependencies?: Record<string, string>;
  }

  export interface Plugin extends Omit<NpmSearchPackage, 'date'> {
    avatar: string;
    downloads: number;
    isCompatible: boolean;
    updatedAt: string;
  }
  const PLUGIN_PREFIX = 'kokkoro-plugin-';
  const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search?text=keywords%3Akokkoro&size=250';
  const NPM_DOWNLOADS_URL = 'https://api.npmjs.org/downloads/point/last-month/';
  const NPM_REGISTRY_URL = 'https://registry.npmjs.org/';

  const plugins = shallowRef<Plugin[]>([]);
  const query = shallowRef('');
  const hasError = shallowRef(false);
  const isLoading = shallowRef(true);

  const filteredPlugins = computed(() => {
    const keyword = query.value.trim().toLowerCase();

    if (!keyword) {
      return plugins.value;
    }
    return plugins.value.filter(({ name, description, keywords, maintainers }) =>
      [name, description, ...maintainers.map(({ username }) => username), ...(keywords ?? [])].some(value =>
        value?.toLowerCase().includes(keyword),
      ),
    );
  });

  const checkCompatibility = (range?: string) => {
    const { minor } = range?.match(/(?:^|[^\d])3\.(?<minor>\d+)/)?.groups ?? {};
    return minor ? Number(minor) >= 1 : false;
  };

  const getGravatarUrl = async (email?: string) => {
    if (!email) {
      return '/logo.png';
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');

    return `https://gravatar.com/avatar/${hash}?s=96&d=identicon`;
  };

  const loadPlugins = async () => {
    hasError.value = false;
    isLoading.value = true;

    try {
      const searchResponse = await fetch(NPM_SEARCH_URL);

      if (!searchResponse.ok) {
        throw new Error(`npm search failed: ${searchResponse.status}`);
      }
      const { objects } = <NpmSearchResponse>await searchResponse.json();
      const packages = objects
        .map(({ package: packageInfo }) => packageInfo)
        .filter(({ name }) => name.startsWith(PLUGIN_PREFIX));

      if (!packages.length) {
        plugins.value = [];
        return;
      }
      const encodedNames = packages.map(({ name }) => encodeURIComponent(name));
      const [downloadsResponse, packageDetails] = await Promise.all([
        fetch(`${NPM_DOWNLOADS_URL}${encodedNames.join(',')}`),
        Promise.all(
          packages.map(async packageInfo => {
            const [maintainer] = packageInfo.maintainers;
            const name = encodeURIComponent(packageInfo.name);
            const response = await fetch(`${NPM_REGISTRY_URL}${name}/latest`);
            if (!response.ok) {
              throw new Error(`npm manifest failed: ${response.status}`);
            }
            const [manifest, avatar] = await Promise.all([
              <Promise<PackumentVersion>>response.json(),
              getGravatarUrl(maintainer?.email),
            ]);

            return { avatar, manifest, packageInfo };
          }),
        ),
      ]);

      if (!downloadsResponse.ok) {
        throw new Error(`npm downloads failed: ${downloadsResponse.status}`);
      }
      const downloads = <Record<string, NpmDownloadPoint>>await downloadsResponse.json();

      plugins.value = packageDetails
        .map(({ avatar, manifest, packageInfo: { date: updatedAt, ...packageInfo } }) => ({
          ...packageInfo,
          avatar,
          downloads: downloads[packageInfo.name]?.downloads ?? 0,
          isCompatible: checkCompatibility(manifest.peerDependencies?.['@kokkoro/core']),
          updatedAt,
        }))
        .sort((left, right) => right.downloads - left.downloads || left.name.localeCompare(right.name));
    } catch {
      hasError.value = true;
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(loadPlugins);
</script>

<template>
  <main class="market">
    <header class="header">
      <h1 class="title">插件市场</h1>
      <p class="description">发现并安装 Kokkoro 插件，列表按近一个月下载量排序。</p>
    </header>

    <div class="toolbar">
      <label class="search">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
        <span class="visually-hidden">搜索插件</span>
        <input
          v-model="query"
          type="search"
          name="plugin-search"
          placeholder="搜索插件名称或功能…"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
      <output v-if="!isLoading && !hasError" class="count">{{ filteredPlugins.length }} 个插件</output>
    </div>

    <p v-if="isLoading" class="status" aria-live="polite">正在加载插件……</p>

    <div v-else-if="hasError" class="status">
      <span>插件加载失败</span>
      <button type="button" @click="loadPlugins">重新加载</button>
    </div>

    <p v-else-if="!filteredPlugins.length" class="status">没有找到相关插件</p>

    <section v-else class="list" aria-label="插件列表">
      <PluginCard v-for="plugin in filteredPlugins" :key="plugin.name" v-bind="plugin" />
    </section>
  </main>
</template>

<style scoped lang="scss">
  .market {
    width: min(1180px, calc(100% - 48px));
    margin: 0 auto;
    padding: 72px 0 96px;

    .header {
      max-width: 720px;
    }

    .title {
      margin: 0;
      border: 0;
      font-size: clamp(36px, 6vw, 64px);
      letter-spacing: -0.04em;
      line-height: 1.08;
    }

    .description {
      margin: 18px 0 0;
      color: var(--vp-c-text-2);
      font-size: 17px;
      line-height: 1.7;
    }

    .toolbar {
      display: flex;
      margin-top: 44px;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .search {
      position: relative;
      display: flex;
      width: min(520px, 100%);
      padding: 0 12px;
      border: 1px solid var(--vp-c-divider);
      border-radius: 4px;
      align-items: center;
      cursor: text;

      &:focus-within {
        border-color: var(--vp-c-brand-1);
      }

      svg {
        display: block;
        width: 18px;
        margin: 8px;
        fill: none;
        stroke: var(--vp-c-text-3);
        stroke-linecap: round;
        stroke-width: 1.8;
        flex: 0 0 auto;
      }

      input {
        width: 100%;
        min-width: 0;
        padding: 6px 12px;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--vp-c-text-1);
        font: inherit;
      }
    }

    .count {
      color: var(--vp-c-text-2);
      font-size: 13px;
      white-space: nowrap;
    }

    .status {
      display: flex;
      min-height: 250px;
      margin: 20px 0 0;
      border: 1px dashed var(--vp-c-divider);
      border-radius: 8px;
      align-items: center;
      justify-content: center;
      color: var(--vp-c-text-2);
      gap: 12px;

      button {
        padding: 6px 10px;
        border: 1px solid var(--vp-c-brand-1);
        border-radius: 8px;
        background: transparent;
        color: var(--vp-c-brand-1);
        cursor: pointer;

        &:hover {
          background: var(--vp-c-brand-soft);
        }

        &:focus-visible {
          outline: 2px solid var(--vp-c-brand-1);
          outline-offset: 2px;
        }
      }
    }

    .list {
      display: grid;
      margin-top: 20px;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 18px;
    }

    @media (max-width: 640px) {
      width: min(100% - 32px, 1180px);
      padding: 48px 0 72px;

      .toolbar {
        margin-top: 32px;
        align-items: stretch;
        flex-direction: column;
        gap: 10px;
      }

      .list {
        grid-template-columns: 1fr;
      }
    }
  }
</style>
