import { actionSubscribe, autorun, reaction, reactive, when } from '../src';
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

    it('works in parallel', async () => {
        class State {
            value = 0;

            constructor() {
                reactive(this);
            }
        }

        const state = new State();

        let triggersCount = 0;

        (async () => {
            await when(() => state.value >= 2);
            triggersCount++;
        })();

        (async () => {
            try {
                await when(() => state.value >= 20, 50);
                triggersCount++;
            } catch (e) {

            }
        })();

        (async () => {
            await when(() => state.value >= 2);
            triggersCount++;
        })();

        for (let i = 0; i < 2; i++) {
            state.value++;
            await reactionsExecuted();
        }

        await sleep(150);

        assert.equal(triggersCount, 2);
    });

    it('trigger on non reactive item', async () => {
        let value = false;

        setTimeout(() => {
            value = true;
        }, 20);

        let whenTriggered = false;
        (async () => {
            await when(() => value);
            whenTriggered = true;
        })();

        await sleep(160);

        assert.equal(whenTriggered, true);
    });

    it('reject on timeout', async () => {
        let value = false;

        setTimeout(() => {
            value = true;
        }, 120);

        await expect(async () => {
            await when(() => value, 40);
        }).rejects.toThrowError();
    });
})
