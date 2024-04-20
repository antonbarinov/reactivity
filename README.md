# Reactive
Reactivity library based on getters/setters, auto-batching, async reactions (by default).

## Main concepts:
- Auto subscribe/unsubscribe.
- Auto batching synchronous changes.
- Minimum possible code.

## Quick example
```javascript
import { reactive, autorun, markSynchronousReactions } from 'reactive';

class State {
    counter = 0;
    syncCounter = 0;

    constructor() {
        reactive(this);
        markSynchronousReactions(this, 'syncCounter');
    }

    incr = () => {
        this.counter++;
        this.syncCounter++;
    };

    decr = () => {
        this.counter--;
        this.syncCounter--;
    };
}

const state = new State();

autorun(() => {
    console.log('syncCounter', state.syncCounter);
});

autorun(() => {
    console.log('counter', state.counter);
});

setInterval(() => {
    state.incr();
    state.incr();
}, 500);
```
