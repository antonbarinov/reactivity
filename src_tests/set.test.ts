import { autorun, reaction, reactive, when } from '../src';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'
import { reactionsExecuted } from '../src/internal';


describe('set', () => {
    it('correct', async () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 2 };
        const obj3 = { a: 3 };

        class Test {
            set = new Set();

            constructor() {
                reactive(this);
            }
        }

        const test = new Test();

        let size = 0;
        let sizeChangedTimes = -1;

        let mapVal = false;
        let mapValChangedTimes = -1;

        autorun(() => {
            mapValChangedTimes++;
            mapVal = test.set.has(obj1);
        });

        autorun(() => {
            sizeChangedTimes++;
            size = test.set.size;
        });

        assert.equal(size, 0);
        assert.equal(mapVal, false);

        test.set.add(obj2);

        await reactionsExecuted();
        assert.equal(size, 1);
        assert.equal(mapVal, false);

        test.set.add(obj1);

        await reactionsExecuted();
        assert.equal(size, 2);
        assert.equal(mapVal, true);

        test.set.add(obj3);

        await reactionsExecuted();
        assert.equal(size, 3);
        assert.equal(mapVal, true);

        test.set.delete(obj3);

        await reactionsExecuted();
        assert.equal(size, 2);
        assert.equal(mapVal, true);

        test.set.delete(obj1);

        await reactionsExecuted();
        assert.equal(size, 1);
        assert.equal(mapVal, false);

        // nothing changed
        test.set.add(obj1);
        test.set.delete(obj1);

        // use sleep because reactions won't be executed and reactionsExecuted() will not be fired
        await sleep(1);
        assert.equal(mapValChangedTimes, 2);
        assert.equal(sizeChangedTimes, 5);

        // nothing changed except size
        test.set.add(obj1);
        test.set.clear();

        await reactionsExecuted();
        assert.equal(mapValChangedTimes, 2);
        assert.equal(sizeChangedTimes, 6);


        // nothing changed
        test.set.add(obj1);
        test.set.clear();

        // use sleep because reactions won't be executed and reactionsExecuted() will not be fired
        await sleep(1);
        assert.equal(mapValChangedTimes, 2);
        assert.equal(sizeChangedTimes, 6);
    })
})
