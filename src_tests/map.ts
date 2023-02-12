import { autorun, reactive } from '../src';


class Test {
    set = new Set();
    map = new Map();

    constructor() {
        reactive(this);
    }
}

const test = new Test();

const obj1 = { a: 1 };
const obj2 = { a: 2 };

autorun(() => {
    console.log('map get obj1', test.map.get(obj1));
});

autorun(() => {
    console.log('map size', test.map.size);
});

test.map.set(obj2, '1');
test.map.set(obj2, '2');
test.map.set(obj1, '1');
test.map.set(obj1, '2');
