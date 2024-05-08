import { autorun, reaction, reactive, when } from '../src';
import { sleep } from './helpers';
import { assert, describe, expect, it } from 'vitest'


describe('computed', () => {
    it('compute only once', () => {
        let getterCalls = 0;

        class Test {
            counter = 1;

            constructor(c = 1) {
                reactive(this);
                this.counter = c;
            }

            get double() {
                getterCalls++;
                return this.counter * 2;
            }
        }

        let c = 5;

        const test = new Test(c);

        assert.equal(test.double, c * 2);
        assert.equal(test.double, c * 2);
        assert.equal(getterCalls, 1);

        test.counter = ++c;
        assert.equal(test.double, c * 2);
        assert.equal(test.double, c * 2);
        assert.equal(getterCalls, 2);
    })

    it('cross computed check', () => {
        let getterCalls1 = 0;
        let getterCalls2 = 0;

        class Test {
            counter = 1;

            constructor(c = 1) {
                reactive(this);
                this.counter = c;
            }

            get double() {
                getterCalls1++;
                return this.counter * 2;
            }

            get quadro() {
                getterCalls2++;
                return this.double * 2;
            }
        }

        let c = 5;

        const test = new Test(c);

        assert.equal(test.quadro, c * 4);
        assert.equal(test.quadro, c * 4);

        assert.equal(test.double, c * 2);
        assert.equal(test.double, c * 2);
        assert.equal(test.quadro, c * 4);
        assert.equal(test.quadro, c * 4);
        assert.equal(getterCalls1, 1);
        assert.equal(getterCalls2, 1);

        test.counter = ++c;

        assert.equal(test.double, c * 2);
        assert.equal(test.double, c * 2);
        assert.equal(test.quadro, c * 4);
        assert.equal(test.quadro, c * 4);
        assert.equal(getterCalls1, 2);
        assert.equal(getterCalls2, 2);
    })
})
