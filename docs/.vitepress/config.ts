import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Kokkoro',
  description: 'とある咕咕の QQ 机器人框架',
  lang: 'zh-CN',
  srcDir: './content',
  vite: {
    publicDir: '../public',
  },
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    nav: [
      {
        text: '文档',
        items: [
          { text: '深度指南', link: '/guide/introduction' },
          { text: '快速上手', link: '/guide/quick-start' },
        ],
      },
      {
        text: '开发',
        link: '/develop/overview',
        activeMatch: '/develop/',
      },
      {
        text: '插件',
        activeMatch: '/plugin/',
        items: [
          { text: '插件市场', link: '/plugin/market' },
          { text: '插件计划', link: '/plugin/plan' },
        ],
      },
      {
        text: '关于',
        activeMatch: '/about/',
        items: [
          { text: '常见问题', link: '/about/faq' },
          // { text: '计划', link: '/about/roadmap' },
          // { text: '历史', link: '/about/history' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速上手', link: '/guide/quick-start' },
          ],
        },
        {
          text: '基础',
          items: [
            { text: '配置文件', link: '/guide/config' },
            { text: '环境变量', link: '/guide/environment-variables' },
          ],
        },
      ],
      '/develop/': [
        {
          text: '基础',
          items: [
            { text: '插件概述', link: '/develop/overview' },
            { text: '编写第一个插件', link: '/develop/first-plugin' },
            { text: '事件监听', link: '/develop/event' },
            { text: '指令参数', link: '/develop/command' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '插件生命周期', link: '/develop/lifecycle' },
            { text: '副作用清理', link: '/develop/side-effects' },
            { text: '数据持久化', link: '/develop/persistence' },
          ],
        },
      ],
    },
    outline: {
      label: '本页目录',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索',
          },
          modal: {
            noResultsText: '无法找到相关结果',
            displayDetails: '显示列表详细',
            resetButtonTitle: '清除查询条件',
            footer: {
              closeText: '关闭',
              selectText: '选择',
              navigateText: '切换',
            },
          },
        },
      },
    },
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/kokkorojs/kokkoro',
      },
      {
        icon: {
          svg: '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M980.798 694.106c-21.144-122.797-109.845-203.25-109.845-203.25 12.648-111.478-33.792-131.266-33.792-131.266C827.392 14.668 530.986 20.674 524.731 20.84 518.476 20.674 222.014 14.668 212.3 359.59c0 0-46.467 19.788-33.82 131.266 0 0-88.7 80.453-109.817 203.25 0 0-11.292 207.485 101.404 25.406 0 0 25.351 69.162 71.791 131.266 0 0-83.083 28.257-75.998 101.625 0 0-2.878 81.837 177.401 76.219 0 0 126.7-9.853 164.753-63.516h33.515c38.026 53.635 164.726 63.515 164.726 63.515 180.224 5.618 177.401-76.219 177.401-76.219 7.03-73.368-75.997-101.625-75.997-101.625 46.44-62.104 71.791-131.266 71.791-131.266 92.585 182.079 81.348-25.406 81.348-25.406Z"/></svg>',
        },
        link: 'https://jq.qq.com/?_wv=1027&k=3hcWCnhq',
        ariaLabel: 'QQ 群',
      },
    ],
    footer: {
      message: 'Released under the <a href="https://github.com/kokkorojs/kokkoro/blob/master/LICENSE">MIT License</a>.',
      copyright: 'Copyright © 2020-2026 <a href="https://github.com/xueelf">Yuki</a>',
    },
    editLink: {
      pattern: 'https://github.com/kokkorojs/kokkoro/edit/master/docs/content/:path',
      text: '帮助改善当前页面',
    },
    lastUpdated: {
      text: '更新日期',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色主题',
    darkModeSwitchTitle: '切换到深色主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '返回顶部',
  },
});
