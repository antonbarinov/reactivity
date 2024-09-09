import { autorun, reaction, reactive, when, actionSubscribe, markSynchronousReactions } from '../src';
import { sleep } from './helpers';
import { assert } from 'vitest';

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

console.log('test.double', test.double);
console.log('test.double', test.double);
console.log('getterCalls', getterCalls);

test.counter = ++c;

console.log('test.double', test.double);
console.log('test.double', test.double);
console.log('getterCalls', getterCalls);
