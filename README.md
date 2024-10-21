# Reactive
Reactive library based on getters/setters, auto-batching, async reactions (by default).
Inspired by MobX.

## [Docs available here](https://antonbarinov.github.io/reactivity/)

## Main concepts:
- Zero dependencies.
- True computed properties.
- Lightweight: ~4kb gzip.
- Very fast.
- Auto subscribe/unsubscribe.
- Auto batching synchronous changes.
- Minimum possible code.
- Circular dependencies detection.
- Ability to subscribe on actions/functions call.

## Quick example
```javascript
import { reactive, autorun, markSynchronousReactions, actionSubscribe } from 'reactive';

class State {
    counter = 0;
    syncCounter = 0;
    computedCounter = 1;

    constructor() {
        reactive(this);
        markSynchronousReactions(this, 'syncCounter');
    }
    
    get computedValue() {
        console.log('computed calulation');
        return this.computedCounter * 2;
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

actionSubscribe(state.incr, () => {
    console.log(`state.incr() was called`);
})

setInterval(() => {
    state.incr();
    state.incr();
}, 500);

console.log('computedValue', state.computedValue);
console.log('computedValue', state.computedValue);
console.log('computedValue', state.computedValue);
state.computedCounter++;
console.log('computedValue', state.computedValue);
console.log('computedValue', state.computedValue);
console.log('computedValue', state.computedValue);
```
