import { autorun, markSynchronousReactions, reaction, reactive, when } from '../src';
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

        test1.value = 1;

        assert.equal(reaction1Calls, 2);
        assert.equal(reaction2Calls, 1);

        test1.value = 2;

        assert.equal(reaction1Calls, 3);
        assert.equal(reaction2Calls, 1);
    })

    it('async', async () => {
        class Test {
            value = null;

            constructor() {
                reactive(this);
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

        test1.value = 1;

        await reactionsExecuted();
        assert.equal(reaction1Calls, 1);
        assert.equal(reaction2Calls, 0);

        await reactionsExecuted();
        assert.equal(reaction1Calls, 1);
        assert.equal(reaction2Calls, 1);

        await reactionsExecuted();
        assert.equal(reaction1Calls, 2);
        assert.equal(reaction2Calls, 1);

        test1.value = 2;

        await reactionsExecuted();
        assert.equal(reaction1Calls, 3);
        assert.equal(reaction2Calls, 1);
    })

    it('dispose check', async () => {
        class Test {
            value = 1;

            constructor() {
                reactive(this);
                markSynchronousReactions(this, 'value');
            }
        }

        const test = new Test();

        let reactionCalls = 0;

        const disposer = reaction(() => [test.value], () => {
            reactionCalls++;
        })

        assert.equal(reactionCalls, 0);

        disposer();
        test.value++;
        assert.equal(reactionCalls, 0);

        reaction(() => [test.value], (disp) => {
            reactionCalls++;
            disp();
        })

        test.value++;
        assert.equal(reactionCalls, 1);

        test.value++;
        assert.equal(reactionCalls, 1);
    })

    it('dispose check #2', async () => {
        class Test {
            value = 1;

            constructor() {
                reactive(this);
                markSynchronousReactions(this, 'value');
            }
        }

        const test = new Test();

        let reactionCalls = 0;

        const disposer = autorun(() => {
            const a = test.value;
            reactionCalls++;
        })

        assert.equal(reactionCalls, 1);

        disposer();
        test.value++;
        assert.equal(reactionCalls, 1);

        autorun((disp) => {
            const a = test.value;
            reactionCalls++;
            disp();
        })

        test.value++;
        assert.equal(reactionCalls, 2);

        test.value++;
        assert.equal(reactionCalls, 2);
    })

    it('circular dep', async () => {
        class Test {
            value = 1;

            constructor() {
                reactive(this);
                markSynchronousReactions(this, 'value');
            }
        }

        const test = new Test();

        let reactionCalls = 0;

        autorun((disposeFn) => {
            test.value++;
            reactionCalls++;

            if (reactionCalls > 5) {
                disposeFn();
            }
        })

        assert.equal(reactionCalls, 2);
    })

    it('circular dep async', async () => {
        class Test {
            value = 1;

            constructor() {
                reactive(this);
                //markSynchronousReactions(this, 'value');
            }
        }

        const test = new Test();

        let reactionCalls = 0;

        autorun((disposeFn) => {
            test.value++;
            reactionCalls++;

            if (reactionCalls > 5) {
                disposeFn();
            }
        })

        await sleep(10);

        assert.equal(reactionCalls, 2);
    })
})
