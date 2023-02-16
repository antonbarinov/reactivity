import { autorun, reactive } from '../src';

const obj1 = { a: 1 };
const obj2 = { a: 2 };

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
test.set.clear();
