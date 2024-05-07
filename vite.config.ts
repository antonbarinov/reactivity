import { Alias, defineConfig, splitVendorChunkPlugin, UserConfig } from 'vite';
import * as path from 'path';
import * as fs from 'fs';

// @ts-ignore
import packageJson from './package.json';
// @ts-ignore
import { typingsGenerationPlugin } from './vite_plugins/types_declarations';

process.env.NODE_ENV ??= 'development';

const config = defineConfig(({ command, mode, ssrBuild }) => ({
    build: {
        target: 'es2018',
        lib: {
            formats: ['cjs'],
            entry: [
                './src/index.ts',
                './src/react_bindings.ts'
            ],
        },
        rollupOptions: {
            external: ['react'],
        }
    },
    server: {
        host: '0.0.0.0',
    },

    define: {
        '__NODE_ENV__': `'${process.env.NODE_ENV}'`,
    },

    resolve: {
        alias: generateResolvers(),
    },
    plugins: [
        typingsGenerationPlugin(command, mode),
    ]
} as UserConfig));

// https://vitejs.dev/config/
export default config;


function generateResolvers() {
    const resolvers: Alias[] = [];
    const srcDir = path.resolve(__dirname, 'src');
    const dirs = fs.readdirSync(path.resolve(__dirname, 'src'));

    for (const item of dirs) {
        // File
        if (item.indexOf('.') !== -1) {
            resolvers.push({ find: item, replacement: path.resolve(srcDir, item) });
        }
        // Folder
        else {
            // @ts-ignore
            if (packageJson.dependencies && packageJson.dependencies[item] === undefined) {
                resolvers.push({ find: item, replacement: path.resolve(srcDir, item) });
            }
        }
    }

    // Resolve assets absolute urls
    resolvers.push({ find: /^\/assets\/\.*/g, replacement: path.resolve(srcDir, 'assets') + '/' });

    return resolvers;
}

