import { autorun, reactive } from '../src';
import { sleep } from './helpers';

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



autorun(() => {
    console.log('set has obj1', test.set.has(obj1));
});

autorun(() => {
    console.log('set size', test.set.size);
});

/*
test.set.add(obj2);
test.set.add(obj2);
test.set.add(obj1);
test.set.delete(obj2);
test.set.delete(obj1);

test.set.add(obj1);
test.set.clear();
test.set.add(obj1);
test.set.add(obj1);
test.set.add(obj1);
test.set.clear();*/

(async () => {
    test.set.add(obj2);
    await sleep(1);
    test.set.add(obj1);
    await sleep(1);
    test.set.add(obj3);
    await sleep(1);
    test.set.delete(obj3);
    await sleep(1);
    test.set.delete(obj1);
    await sleep(1);
})();

