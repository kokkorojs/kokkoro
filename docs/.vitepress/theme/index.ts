import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';

import ChatAvatar from './components/chat/ChatAvatar.vue';
import ChatMessage from './components/chat/ChatMessage.vue';
import ChatPanel from './components/chat/ChatPanel.vue';

import './style.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ChatAvatar', ChatAvatar);
    app.component('ChatMessage', ChatMessage);
    app.component('ChatPanel', ChatPanel);
  },
} satisfies Theme;
