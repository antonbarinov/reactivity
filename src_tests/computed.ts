import { autorun, reaction, reactive, when } from '../src';
import { sleep } from './helpers';



class Test {
    counter = 1;

    constructor(c = 1) {
        reactive(this);
        this.counter = c;
    }

    get mult() {
        console.log('exeс mult getter');
        return this.counter * 2;
    }

    get mult2() {
        console.log('exeс mult2 getter');
        return this.mult * 2;
    }
}

const test = new Test(1);
const test2 = new Test(2);

console.log(test.mult);
console.log(test2.mult);

console.log(test.mult2);
console.log(test2.mult2);

console.log(test.mult);
console.log(test2.mult);

console.log(test.mult2);
console.log(test2.mult2);

test.counter = 3;
test2.counter = 4;

console.log(test.mult);
console.log(test2.mult);

console.log(test.mult2);
console.log(test2.mult2);

console.log(test.mult);
console.log(test2.mult);

console.log(test.mult2);
console.log(test2.mult2);
