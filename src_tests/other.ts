import { autorun, reaction, reactive, when } from '../src';
import { sleep } from '../src_tests/helpers';



class Test {
    counter = 1;

    constructor() {
        reactive(this);
    }
}

const test = new Test();

const disp1 = reaction(() => test.counter, () => {
    console.log('reaction #1', test.counter);
});

const disp2 = reaction(() => test.counter, () => {
    console.log('reaction #2', test.counter);
    test.counter++;
    /*
    setTimeout(() => {
        test.counter++;
        test.counter++;
    });*/
});

autorun(() => {
    console.log('autorun #1', test.counter);
    test.counter++;
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

