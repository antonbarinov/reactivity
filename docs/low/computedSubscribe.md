---
outline: deep
---

# computedSubscribe
The `computedSubscribe` is object instance of reactive control on computed observables.

- **Properties**

`pauseTracking()` - observables inside computed stop subscribing on current computed function until `resumeTracking()` was called. Can be called **only** inside computed functions.

`pauseTracking()` - observables resume subscribing on current computed function. Can be called **only** inside computed functions.

## Examples

##### Example #1
```typescript
class State {
    counter1 = 0;
    counter2 = 0;
    counter3 = 0;

    constructor() {
        reactive(this);
    }

    get comp1() {
        const c1 = this.counter1;
        computedSubscribe.pauseTracking();
        const c2 = this.counter2; // changes will not affect this computed

        return c1 + c2;
    }
}

const state = new State();

autorun(() => {
    console.log('autorun[____]', state.comp1);
})

autorun(() => {
    reactiveSubscribe.pauseTracking();
    const computed = state.comp1; // ignore computed changes
    reactiveSubscribe.resumeTracking();
    console.log('autorun[]', computed, state.counter3);
})


reactiveSubscribe.syncMode = true;
state.counter1++;
state.counter2++;
state.counter2++;
state.counter2++;
state.counter1++;

state.counter3++;
state.counter3++;
reactiveSubscribe.syncMode = false;
```
Output:
```
autorun[____] 0
autorun[] 0 0
autorun[____] 1
autorun[____] 5
autorun[] 5 1
autorun[] 5 2
```
