import { autorun, reaction, reactive } from '../src';



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

setInterval(() => {
    test.counter++;
}, 1000);

