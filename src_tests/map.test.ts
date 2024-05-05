import { autorun, reaction, reactive, when } from '../src';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'
import { reactionsExecuted } from '../src/internal';


describe('map', () => {
    it('correct', async () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 2 };

        class Test {
            map = new Map();

            constructor() {
                reactive(this);
            }
        }

        const test = new Test();

        let size = 0;
        let mapVal;

        autorun(() => {
            mapVal = test.map.get(obj1);
        });

        autorun(() => {
            size = test.map.size;
        });

        assert.equal(size, 0);
        assert.equal(mapVal, undefined);

        test.map.set(obj2, '1');
        test.map.set(obj2, '2');
        test.map.set(obj1, '1');
        test.map.set(obj1, '5');

        await reactionsExecuted();
        assert.equal(size, 2);
        assert.equal(mapVal, '5');

        test.map.set(obj1, '2');

        await reactionsExecuted();
        assert.equal(size, 2);
        assert.equal(mapVal, '2');

        test.map.set(obj1, '3');
        test.map.clear();

        await reactionsExecuted();
        assert.equal(size, 0);
        assert.equal(mapVal, undefined);
    })
})
