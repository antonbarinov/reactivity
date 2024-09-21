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
            //{ text: 'Example', link: '/example' },

            {
                text: 'High level API',
                items: [
                    { text: 'reactive', link: '/high/reactive' },
                ],
            },

            // ...
        ],

        sidebar: [
            {
                text: 'High level API',
                items: [
                    { text: 'reactive', link: '/high/reactive' },
                ],
            },
        ],
    },
});
