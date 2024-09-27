---
outline: deep
---

# actionSubscribe()

Sometimes you may want to subscribe on functions calls.

Returns unsubscribe function.

- **Type**
```typescript
declare function actionSubscribe(action: Function, cb: (unsubscribeFn: Function) => any): () => void;
```

- **Params**

`action` (required) - function inside reactive object.

`cb` (required) - callback that fires when `action` is called. `cb` has 
argument (`unsubscribeFn`) that unsubscribe of it.

# actionUnsubscribe()
Same as `actionSubscribe()` but for unsubscribe.

## Examples

##### Example #1

```typescript
class State {    
    constructor() {
        reactive(this);
    }
    
    doSome = () => {
        // do some staff
        console.log('exec doSome');
    }
}

const state = new State();

const unsubscribeFn = actionSubscribe(state.doSome, (unsubscribe) => {
    console.log('actionSubscribe for doSome');
    // unsubscribe if needed and when needed
    // unsubscribe();
});

// unsubscribe if needed and when needed
// unsubscribeFn();

state.doSome();
state.doSome();
```
Output:
```
exec doSome
actionSubscribe for doSome
exec doSome
actionSubscribe for doSome
```
