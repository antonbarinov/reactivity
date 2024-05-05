import { autorun, reaction, reactive, when } from '../src';
import { reactionsExecuted } from '../src/internal';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'



describe('arrays', () => {
    it('correct', async () => {
        class Test {
            arr = [1,2,3];

            constructor() {
                reactive(this);
            }
        }

        const test = new Test();

        let res = [];
        let index = 0;
        function next() {
            return res[index++];
        }

        autorun(() => {
            res.push(JSON.parse(JSON.stringify(test.arr)));
        });

        test.arr.push(4);

        assert.deepEqual(next(), [1,2,3]);

        await reactionsExecuted();
        assert.deepEqual(next(), [1,2,3,4]);

        test.arr.push(5);
        test.arr.pop();
        test.arr.pop();

        await reactionsExecuted();
        assert.deepEqual(next(), [1,2,3]);

        test.arr = null;

        await reactionsExecuted();
        assert.deepEqual(next(), null);

        test.arr = [1];

        await reactionsExecuted();
        assert.deepEqual(next(), [1]);

        test.arr.push(2);

        await reactionsExecuted();
        assert.deepEqual(next(), [1, 2]);

        test.arr.shift();

        await reactionsExecuted();
        assert.deepEqual(next(), [2]);
    })
})
