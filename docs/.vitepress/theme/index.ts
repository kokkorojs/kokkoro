import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

import ChatAvatar from './components/chat/ChatAvatar.vue';
import ChatMessage from './components/chat/ChatMessage.vue';
import ChatPanel from './components/chat/ChatPanel.vue';
import PluginMarket from './components/market/PluginMarket.vue';
import ThemeImage from './components/ThemeImage.vue';

import './style.scss';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ChatAvatar', ChatAvatar);
    app.component('ChatMessage', ChatMessage);
    app.component('ChatPanel', ChatPanel);
    app.component('PluginMarket', PluginMarket);
    app.component('ThemeImage', ThemeImage);
  },
} satisfies Theme;
