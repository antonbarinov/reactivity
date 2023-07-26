import { autorun, reactive } from '../src';
import { sleep } from './helpers';

const obj1 = { a: 1 };
const obj2 = { a: 2 };

class Test {
    set = new WeakSet();

    constructor() {
        reactive(this);
    }
}

const test = new Test();



autorun(() => {
    console.log('set has obj1', test.set.has(obj1));
});

autorun(() => {
    console.log('set has obj2', test.set.has(obj2));
});

test.set.add(obj2);
test.set.add(obj2);
test.set.add(obj1);
test.set.delete(obj2);
test.set.delete(obj1);

(async () => {
    test.set.add(obj1);
    await sleep(1);
    test.set.delete(obj1);
    await sleep(1);
    test.set.add(obj1);
    test.set.add(obj1);
    test.set.add(obj1);
    test.set.add(obj2);
})();


