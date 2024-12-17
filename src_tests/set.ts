import { autorun, reaction, reactive, when, actionSubscribe, markSynchronousReactions } from '../src';
import { sleep } from './helpers';
import { assert } from 'vitest';

class Test {
    testSet = new Set();

    constructor() {
        reactive(this);
    }

    get testSetGetter() {
        let i = 0;
        test.testSet.forEach(() => {
            i++;
        });

        return i;
    }
}

const test = new Test();

reaction(() => test.testSet.forEach(() => {}), () => console.log('testSet reaction'));

autorun(() => {
   console.log('autorun', test.testSetGetter);
});

autorun(() => {
    console.log('autorun #2', test.testSet.has(2));
});

(async () => {
    await sleep(10);
    test.testSet.add(1);
    await sleep(10);
    test.testSet.add(2);
})();
