import { autorun, reaction, reactive, when, markSynchronousReactions } from '../src';
import { reactionsExecuted } from '../src/internal';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'



describe('sync_async', () => {
    it('async auto batching', async () => {
        class Test {
            count = 1;

            constructor() {
                reactive(this);
            }
        }

        const test = new Test();

        let callsCount = 0;
        autorun(() => {
            callsCount++;
            const a = test.count;
        });

        assert.equal(callsCount, 1);

        test.count++;
        test.count++;
        test.count++;

        await reactionsExecuted();
        assert.equal(callsCount, 2);
    })

    it('sync reactions', async () => {
        class Test {
            count = 1;

            constructor() {
                reactive(this);

                markSynchronousReactions(this, 'count');
            }
        }

        const test = new Test();

        let callsCount = 0;
        autorun(() => {
            callsCount++;
            const a = test.count;
        });

        assert.equal(callsCount, 1);

        test.count++;
        test.count++;
        test.count++;

        assert.equal(callsCount, 4);
    })
})
