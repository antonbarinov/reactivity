import { Alias, defineConfig, splitVendorChunkPlugin, UserConfig } from 'vite';
import * as path from 'path';
import fs from 'fs';


import packageJson from './package.json';


process.env.NODE_ENV ??= 'development';

let assetFileNamesPrefix = 'assets';
if (process.env.NODE_ENV === 'production') {
    //assetFileNamesPrefix = 'assets';
}

const config = defineConfig(({ command, mode, ssrBuild }) => ({
    build: {
        target: 'es2015',
        lib: {
            entry: [
                './src/index.ts',
                './src/react.ts'
            ],
            //formats: ['es', 'cjs'],
        },
        rollupOptions: {
            external: ['react'],
        }
    },

    define: {
        '__NODE_ENV__': `'${process.env.NODE_ENV}'`,
    },

    resolve: {
        alias: generateResolvers(),
    },
    plugins: []
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
            if (packageJson.dependencies[item] === undefined) {
                resolvers.push({ find: item, replacement: path.resolve(srcDir, item) });
            }
        }
    }

    // Resolve assets absolute urls
    resolvers.push({ find: /^\/assets\/\.*/g, replacement: path.resolve(srcDir, 'assets') + '/' });

    return resolvers;
}

