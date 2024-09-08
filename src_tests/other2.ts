import { autorun, reaction, reactive, when, actionSubscribe, markSynchronousReactions } from '../src';
import { sleep } from './helpers';

let getterCalls = 0;
let reactionsCount = 0;

class Test {
    counter = 1;

    constructor(c = 1) {
        reactive(this);
        this.counter = c;
        markSynchronousReactions(this, 'quadro');
    }

    get double() {
        getterCalls++;
        return this.counter * 2;
    }

    get quadro() {
        getterCalls++;
        return this.double * 2;
    }
}

let c = 1;

const test = new Test(c);

autorun(() => {
    reactionsCount++;
    console.log('test.quadro', test.quadro);
});

autorun(() => {
    console.log('counter', test.counter);
});

test.counter++;
test.counter++;

console.log('reactionsCount', reactionsCount)
