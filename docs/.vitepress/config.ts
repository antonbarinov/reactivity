import { defineConfig } from 'vitepress';
import packageJson from '../../package.json';

// refer https://vitepress.dev/reference/site-config for details
export default defineConfig({
    lang: 'en-US',
    title: 'Reactive',
    description: 'Reactive state manager base on getters/setters',
    //appearance: 'dark', // dark theme by default
    lastUpdated: true,
    themeConfig: {
        outline: 'deep',
        search: {
            provider: 'local',
            options: {
                miniSearch: {
                    searchOptions: {
                        // @ts-ignore
                        detailedView: true,
                    },
                },
            },
        },
        nav: [
            { text: `ver. ${packageJson.version}`, link: '' },
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
            { icon: 'github', link: 'https://github.com/antonbarinov/reactivity' },
        ],

        sidebar: [
            {
                text: 'High level API',
                items: [
                    { text: 'reactive', link: '/high/reactive' },
                    { text: 'autorun', link: '/high/autorun' },
                    { text: 'reaction', link: '/high/reaction' },
                    { text: 'when', link: '/high/when' },
                    { text: 'markSynchronousReactions', link: '/high/markSynchronousReactions' },
                    { text: 'actionSubscribe', link: '/high/actionSubscribe' },
                ],
            },
            {
                text: 'Low level API',
                items: [
                    { text: 'createReaction', link: '/low/createReaction' },
                    { text: 'reactiveSubscribe', link: '/low/reactiveSubscribe' },
                    { text: 'computedSubscribe', link: '/low/computedSubscribe' },
                ],
            },
            {
                text: 'React integration',
                items: [
                    { text: 'observer', link: '/react/observer' },
                ],
            },
        ],
    },

    base: process.env.GITHUB_PAGES_DOCS_BUILD ? '/reactivity': '/',
});
