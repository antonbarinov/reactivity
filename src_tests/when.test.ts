import { autorun, reaction, reactive, when } from '../src';
import { reactionsExecuted } from '../src/internal';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'



describe('when', () => {
    it('must trigger', async () => {
        class State {
            value = 0;

            constructor() {
                reactive(this);
            }
        }

        const state = new State();

        let whenTriggered = false;
        (async () => {
            await when(() => state.value >= 2);
            whenTriggered = true;
        })();

        for (let i = 0; i < 2; i++) {
            state.value++;
            await reactionsExecuted();
        }

        assert.equal(whenTriggered, true);
    });

    it('no trigger', async () => {
        class State {
            value = 0;

            constructor() {
                reactive(this);
            }
        }

        const state = new State();

        let whenTriggered = false;
        (async () => {
            await when(() => state.value >= 20);
            whenTriggered = true;
        })();

        for (let i = 0; i < 2; i++) {
            state.value++;
            await reactionsExecuted();
        }

        assert.equal(whenTriggered, false);
    })
})
