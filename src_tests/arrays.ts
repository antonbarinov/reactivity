import { autorun, reaction, reactive, when } from '../src';
import { sleep } from './helpers';



class Test {
    arr = [1,2,3];

    constructor() {
        reactive(this);
    }
}

const test = new Test();

autorun(() => {
    console.log(JSON.parse(JSON.stringify(test.arr)));
});



(async () => {
    await sleep();
    test.arr.push(4);
    await sleep();
    test.arr.push(5);
    test.arr.pop();
    test.arr.pop();
    await sleep();
    test.arr = null;
    await sleep();
    test.arr = [1];
    await sleep();
    test.arr.push(2);
    await sleep();
    test.arr = [1,2];
    await sleep();
    test.arr = [1,2];
    await sleep();
    test.arr = [1,2,3];
})();


