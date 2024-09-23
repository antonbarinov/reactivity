import { autorun, reaction, reactive, when, markSynchronousReactions  } from '../src';
import { reactionsExecuted } from '../src/internal';
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

    it('computed reacts on Array.push', () => {
        let getterCalls = 0;

        class Test {
            value = [];

            constructor() {
                reactive(this);
            }

            get valueLen() {
                getterCalls++;
                return this.value.length;
            }
        }

        const test = new Test();

        assert.equal(test.valueLen, 0);
        assert.equal(test.valueLen, 0);
        assert.equal(getterCalls, 1);

        test.value.push(1);
        assert.equal(test.valueLen, 1);
        assert.equal(test.valueLen, 1);
        assert.equal(getterCalls, 2);
    })

    it('computed reacts on Array.push after async update', async () => {
        let getterCalls = 0;

        class Test {
            value = [];

            constructor() {
                reactive(this);
            }

            get valueLen() {
                getterCalls++;
                return this.value.length;
            }
        }

        const test = new Test();

        assert.equal(test.valueLen, 0);
        assert.equal(test.valueLen, 0);
        assert.equal(getterCalls, 1);

        test.value.push(1);

        await reactionsExecuted();

        assert.equal(test.valueLen, 1);
        assert.equal(test.valueLen, 1);
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

    it('reactions on computed', async () => {
        let getterCalls = 0;
        let reactionsCount = 0;

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

        let c = 1;

        const test = new Test(c);

        autorun(() => {
            reactionsCount++;
            let a = test.double;
        });

        autorun(() => {
            reactionsCount++;
            let a = test.double;
        });

        autorun(() => {
            reactionsCount++;
            let a = test.double;
        });

        test.counter++;

        await reactionsExecuted();

        assert.equal(reactionsCount, 6);

        test.counter++;
        test.counter--;

        await reactionsExecuted();

        assert.equal(reactionsCount, 6);
    })

    it('reactions on computed in sync mode', async () => {
        let getterCalls = 0;
        let reactionsCount = 0;

        class Test {
            counter = 1;

            constructor(c = 1) {
                reactive(this);
                this.counter = c;
                markSynchronousReactions(this, 'double');
            }

            get double() {
                getterCalls++;
                return this.counter * 2;
            }
        }

        let c = 1;

        const test = new Test(c);

        autorun(() => {
            reactionsCount++;
            let a = test.double;
        });

        autorun(() => {
            reactionsCount++;
            let a = test.double;
        });

        autorun(() => {
            reactionsCount++;
            let a = test.double;
        });

        test.counter++;
        test.counter++;

        assert.equal(reactionsCount, 9);
        assert.equal(getterCalls, 3);

        // Проверка чтобы лишних асинхронных реакций не было после отработки синхронных
        await reactionsExecuted();
        await sleep(10); // Для перестраховки
        assert.equal(reactionsCount, 9);
        assert.equal(getterCalls, 3);
    })

    it(`dont' trigger compute if dependencies doesn't actually change`, () => {
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

        let c = 1;

        const test = new Test(c);

        assert.equal(test.double, c * 2);
        assert.equal(test.double, c * 2);
        assert.equal(getterCalls, 1);

        test.counter++;
        test.counter--;

        assert.equal(test.double, c * 2);
        assert.equal(test.double, c * 2);
        assert.equal(getterCalls, 1);
    })

    it(`react exactly on computed value change`, async () => {
        class Test {
            counter = 1;

            constructor() {
                reactive(this);
            }

            get tooBig() {
                return this.counter > 5;
            }
        }

        const test = new Test();
        const result = [];
        const result2 = [];

        autorun(() => {
            result.push(test.tooBig);
        });

        autorun(() => {
            result2.push(test.tooBig);
        });

        for (let i = 0; i < 10; i++) {
            test.counter++;
            await reactionsExecuted();
        }

        assert.deepEqual(result, [false, true]);
        assert.deepEqual(result2, [false, true]);

        for (let i = 0; i < 10; i++) {
            test.counter--;
            await reactionsExecuted();
        }

        assert.deepEqual(result, [false, true, false]);
        assert.deepEqual(result2, [false, true, false]);
    })

    it(`react exactly on computed value change [sync]`, () => {
        class Test {
            counter = 1;

            constructor() {
                reactive(this);
                markSynchronousReactions(this, 'counter');
            }

            get tooBig() {
                return this.counter > 5;
            }
        }

        const test = new Test();
        const result = [];
        const result2 = [];

        autorun(() => {
            result.push(test.tooBig);
        });

        autorun(() => {
            result2.push(test.tooBig);
        });

        for (let i = 0; i < 10; i++) {
            test.counter++;
        }

        assert.deepEqual(result, [false, true]);
        assert.deepEqual(result2, [false, true]);

        for (let i = 0; i < 10; i++) {
            test.counter--;
        }

        assert.deepEqual(result, [false, true, false]);
        assert.deepEqual(result2, [false, true, false]);
    })
})
