import { autorun, reaction, reactive, when, actionSubscribe } from '../src';
import { sleep } from './helpers';

class Test {
    counter = 1;

    constructor() {
        reactive(this);
    }

    test = () => {
        this.counter++;
    }
}

const test = new Test();

actionSubscribe(test.test, () => {
    console.log('test called');
});

actionSubscribe(test.test, () => {
    console.log('test called #2');
});

test.test();
test.test();

console.log(test.counter);
