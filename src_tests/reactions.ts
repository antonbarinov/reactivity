import { autorun, reaction, reactive, when, markSynchronousReactions, createReaction, makeSingleReactive, reactiveSubscribe } from '../src';
import { sleep } from './helpers';



class Test {
    value = null;

    constructor() {
        reactive(this);
        markSynchronousReactions(this, 'value');
    }
}

const test1 = new Test();
const test2 = new Test();

reaction(() => [test1.value], () => {
    console.log('test1 reaction');

    if (!test2.value) {
        test2.value = new Date();
    }
})


reaction(() => [test2.value], () => {
    console.log('test2 reaction');

    test1.value = new Date();
})

test1.value = 123;

