---
outline: deep
---

# reactiveSubscribe
The `reactiveSubscribe` is object instance of reactive control on observables.

- **Properties**

`syncMode`(boolean; default: `false`) - when set to `true` all reactions will be synchronous.

`currentEffect` - effect witch observables are subscribe at this moment.

`start(effect: Function)` - set `effect` function witch observables are subscribe. *(Push to effects queue)*

`stop()` - stop subscribing on last `effect` function. *(Pop effects queue)*

`pauseTracking()` - observables(*including computed*) stop subscribing on any effects until `resumeTracking()` was called.

`pauseTracking()` - observables(*including computed*) resume subscribing.

## Examples

##### Example #1
```typescript
class State {
    counter1 = 0;
    counter2 = 0;

    constructor() {
        reactive(this);
    }
}

const state = new State();

autorun(() => {
    const c1 = state.counter1;
    reactiveSubscribe.pauseTracking();
    const c2 = state.counter2; // will be ignore for tracking
    console.log('autorun[____]', c1, c2);
})

autorun(() => {
    const c1 = state.counter1;
    const c2 = state.counter2;
    console.log('autorun[]', c1, c2);
})


reactiveSubscribe.syncMode = true;
state.counter1++;
state.counter2++;
state.counter2++;
state.counter2++;
state.counter1++;
reactiveSubscribe.syncMode = false;
```
Output:
```
autorun[____] 0 0
autorun[] 0 0
autorun[____] 1 0
autorun[] 1 0
autorun[] 1 1
autorun[] 1 2
autorun[] 1 3
autorun[____] 2 3
autorun[] 2 3
```

##### Example #2
```typescript
class State {
    counter1 = 0;
    counter2 = 0;

    constructor() {
        reactive(this);
    }
}

const state = new State();

function effect() {
    console.log('effect');
}

reactiveSubscribe.syncMode = true;
reactiveSubscribe.start(effect);
state.counter1; // subscribe
reactiveSubscribe.stop();

state.counter1++;
state.counter1++;
state.counter1++;

reactiveSubscribe.syncMode = false;
```
Output:
```
effect
effect
effect
```
