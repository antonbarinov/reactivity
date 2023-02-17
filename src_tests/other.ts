import { autorun, reaction, reactive, when } from '../src';
import { sleep } from './helpers';



class Test {
    counter = 1;

    constructor() {
        reactive(this);
    }
}

const test = new Test();

const disp1 = reaction(() => test.counter, (disposeFn) => {
    console.log('reaction #1', test.counter);
    if (test.counter > 5) {
        disposeFn();
    }
});

// Circular dependency
const disp2 = reaction(() => test.counter, () => {
    console.log('reaction #2', test.counter);
    test.counter++;
});

reaction(() => test.counter, (disposeFn) => {
    if (test.counter > 6) {
        console.log('reaction #3', test.counter);
    }
});

// Circular dependency
autorun(() => {
    console.log('autorun #1', test.counter);
    test.counter++;
})

autorun((disposeFn) => {
    console.log('autorun #2', test.counter);
    if (test.counter > 5) {
        disposeFn();
    }
})

//disp1();

test.counter++;
test.counter++;

(async () => {
    await when(() => test.counter > 10);
    console.log('text.counter > 10');
})();

(async () => {
    await when(() => test.counter > 15);
    console.log('text.counter > 15');
})();

setInterval(() => {
    test.counter++;
}, 1000);

