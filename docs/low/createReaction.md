---
outline: deep
---

# createReaction()
The createReaction function accepts `effect` function that fires when any of observables inside `track` function was changed.

Returns object with `track` and `dispose` functions.

- **Type**
```typescript
declare function createReaction(effect: Function): {
    track: (fn: Function) => void;
    dispose: () => void;
};
```

- **Params**

`effect` (required) - effect function.

- **Returned object**

`track` - function that accept function as argument for tracking dependencies inside it.
`dispose` - function for unsubscribe.

## Examples

##### Example #1

```typescript
class State {
    counter = 1;
    counter2 = 1;

    constructor() {
        reactive(this);
        markSynchronousReactions(this, ['counter', 'counter2']);
    }
}

const state = new State();

function myEffect() {
    console.log('myEffect');
}

const react = createReaction(myEffect);

react.track(() => {
    state.counter; //  just read is enough for subscribe
})

state.counter++; // triggers "myEffect"
state.counter2++; // "myEffect" was not triggered

// now we track "counter2" too
react.track(() => {
    state.counter2; //  just read is enough for subscribe
})

state.counter++; // triggers "myEffect"
state.counter2++; // triggers "myEffect"

// unsubscribe if need and when need
// react.dispose();
```
Output:
```
myEffect
myEffect
myEffect
```
