import { ConfigEnv, Plugin } from 'vite';
import * as path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

const projectRoot = path.resolve(__dirname, '../../');

let baseUrl = '';
let outDir = '';


export function typingsGenerationPlugin(command: ConfigEnv['command'], mode: ConfigEnv['mode']) {
    return [
        {
            name: 'vite:typings-generation-plugin:post',
            enforce: 'post',
            configResolved(config) {
                baseUrl = config.base;
                outDir = config.build.outDir;
            },
            buildEnd() {
                if (command !== 'build') return;

                const typingsDir = `./${outDir}/__typings__`;
                exec(`tsc --emitDeclarationOnly --outDir "${typingsDir}"`, (er, out, e) => {
                    fs.cpSync(`${typingsDir}/src`, `./${outDir}`, { recursive: true });
                    fs.rmSync(typingsDir, { recursive: true });
                });
            }
        } as Plugin,
    ];
}
