import { autorun, reaction, reactive, when, actionSubscribe, markSynchronousReactions } from '../src';
import { sleep } from './helpers';
import { assert } from 'vitest';

class Test {
    counter = 1;
    syncCounter = 1;

    constructor() {
        reactive(this);
        markSynchronousReactions(this, 'syncCounter');
    }
}

const test = new Test();

autorun(() => {
    console.log(test.syncCounter, test.counter);
})

test.counter++;
test.syncCounter++;
//test.counter++;
