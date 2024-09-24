import { defineConfig } from 'vitepress';

// refer https://vitepress.dev/reference/site-config for details
export default defineConfig({
    lang: 'en-US',
    title: 'Reactive',
    description: 'Reactive state manager base on getters/setters',

    themeConfig: {
        search: {
            provider: 'local',
            options: {
                miniSearch: {
                    searchOptions: {
                        detailedView: true,
                    },
                },
            },
        },
        nav: [
            { text: 'ver. 1.1.4', link: '' },
            /*
            {
                text: 'High level API',
                items: [
                    { text: 'reactive', link: '/high/reactive' },
                ],
            },*/

            // ...
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
        ],

        sidebar: [
            {
                text: 'High level API',
                items: [
                    { text: 'reactive', link: '/high/reactive' },
                    { text: 'autorun', link: '/high/autorun' },
                    { text: 'reaction', link: '/high/reaction' },
                    { text: 'when', link: '/high/when' },
                ],
            },
        ],
    },
});
