import { autorun, markSynchronousReactions, reaction, reactive, reactiveSubscribe } from '../src';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'
import { reactionsExecuted } from '../src/internal';


describe('reactions', () => {
    it('sync', async () => {
        class Test {
            value = null;

            constructor() {
                reactive(this);
                markSynchronousReactions(this, 'value');
            }
        }

        const test1 = new Test();
        const test2 = new Test();

        let reaction1Calls = 0;
        let reaction2Calls = 0;

        reaction(() => [test1.value], () => {
            reaction1Calls++;

            if (!test2.value) {
                test2.value = new Date();
            }
        })


        reaction(() => [test2.value], () => {
            reaction2Calls++;

            test1.value = new Date();
        })

        assert.equal(reaction1Calls, 0);
        assert.equal(reaction2Calls, 0);
        reactiveSubscribe.ignoreReactivity = true;
        test1.value = 1;

        assert.equal(reaction1Calls, 0);
        assert.equal(reaction2Calls, 0);

        test1.value = 2;

        assert.equal(reaction1Calls, 0);
        assert.equal(reaction2Calls, 0);
        reactiveSubscribe.ignoreReactivity = false;

        test1.value++; // 3

        assert.equal(reaction1Calls, 2);
        assert.equal(reaction2Calls, 1);
    })
})
