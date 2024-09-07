import { autorun, markSynchronousReactions, reaction, reactive, when, actionSubscribe } from '../src';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'
import { reactionsExecuted } from '../src/internal';


describe('subscribe on actions', () => {
    it('subscribe and unsubscribe', async () => {
        class Test {
            value = 0;

            constructor() {
                reactive(this);
            }

            test = () => {
                this.value++;
            }
        }

        const test1 = new Test();
        const test2 = new Test();

        let sub1 = 0;
        let sub2 = 0;

        actionSubscribe(test1.test, () => {
            sub1++;
        })

        const unsub1 = actionSubscribe(test1.test, () => {
            sub1++;
        })

        const unsub2 = actionSubscribe(test2.test, () => {
            sub2++;
        })

        assert.equal(sub1, 0);
        assert.equal(sub2, 0);

        test1.test();
        test1.test();
        test2.test();
        test2.test();

        assert.equal(sub1, 4);
        assert.equal(sub2, 2);

        unsub1();
        unsub2();

        assert.equal(sub1, 4);
        assert.equal(sub2, 2);

        test1.test();
        test1.test();
        test2.test();
        test2.test();

        assert.equal(sub1, 6);
        assert.equal(sub2, 2);

        assert.equal(test1.value, 4);
        assert.equal(test2.value, 4);
    })

    it('throws error on invalid function subscribe', async () => {
        function test() {

        }

        expect(() => {
            actionSubscribe(test, () => {
                console.log('hey');
            })
        }).toThrowError();
    })
})
