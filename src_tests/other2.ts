import { autorun, reaction, reactive, when, actionSubscribe, markSynchronousReactions } from '../src';
import { sleep } from './helpers';
import { assert } from 'vitest';

(async () => {
    let value = false;

    setTimeout(() => {
        value = true;
    }, 190);

    let whenTriggered = false;
    (async () => {
        await when(() => value, 210);
        whenTriggered = true;
        console.log(123);
    })();

    (async () => {
        await when(() => value, 210);
        whenTriggered = true;
        console.log(1234);
    })();

    (async () => {
        await when(() => value, 210);
        whenTriggered = true;
        console.log(12345);
    })();

    await sleep(220);

    console.log('whenTriggered', whenTriggered);
})();
