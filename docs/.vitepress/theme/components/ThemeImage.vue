<script setup lang="ts">
  import { useData } from 'vitepress';
  import { onMounted, shallowRef, watch } from 'vue';

  interface Props {
    alt: string;
    dark: string;
    light: string;
  }

  const props = defineProps<Props>();
  const { isDark } = useData();
  const isImageDark = shallowRef(false);
  const isTransitionEnabled = shallowRef(false);

  onMounted(() => {
    isImageDark.value = isDark.value;

    requestAnimationFrame(() => {
      isTransitionEnabled.value = true;
    });
  });

  watch(isDark, value => {
    requestAnimationFrame(() => {
      isImageDark.value = value;
    });
  });
</script>

<template>
  <figure class="theme-image" :class="{ animated: isTransitionEnabled, dark: isImageDark }">
    <img
      class="image light"
      :src="props.light"
      :alt="isImageDark ? '' : props.alt"
      :aria-hidden="isImageDark"
      width="1408"
      height="792"
      loading="lazy"
    />
    <img
      class="image dark"
      :src="props.dark"
      :alt="isImageDark ? props.alt : ''"
      :aria-hidden="!isImageDark"
      width="1403"
      height="789"
      loading="lazy"
    />
  </figure>
</template>

<style scoped lang="scss">
  .theme-image {
    display: grid;
    margin: 16px 0;
    perspective: 100vw;

    .image {
      width: 100%;
      grid-area: 1 / 1;
      backface-visibility: hidden;
      object-fit: cover;
    }

    .dark {
      transform: rotateY(-180deg);
    }

    &.dark {
      .light {
        transform: rotateY(180deg);
      }

      .dark {
        transform: rotateY(0);
      }
    }

    &.animated .image {
      transition: transform 0.4s;
    }

    @media (prefers-reduced-motion: reduce) {
      &.animated .image {
        transition: none;
      }
    }
  }
</style>
