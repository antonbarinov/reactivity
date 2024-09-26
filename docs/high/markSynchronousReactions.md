---
outline: deep
---

# markSynchronousReactions()

Sometimes you may want some observables to have synchronous reactions on their changes. 
Real case example is for `<input />` or `<textarea />`.

- **Type**
```typescript
declare function markSynchronousReactions<T extends object, K extends keyof T>(target: T, key: K | K[]): void;
```

- **Params**

`target` (required) - reactive object/class instance.

`key` (required) - property  name or array of properties that become synchronous for reactions of their changes.


# unMarkSynchronousReactions()
Same as markSynchronousReactions() but make observables to react on their changes asynchronously again.

## Examples

##### Example #1

```typescript
class State {
    counter1 = 0;
    counter2 = 0;
    
    constructor() {
        reactive(this);

        markSynchronousReactions(this, 'counter1');
        // or using array
        // markSynchronousReactions(this, ['counter1', 'prop2', 'prop3']);
    }
}

const state = new State();

autorun(() => {
   console.log('counter1', state.counter1);
});

autorun(() => {
    console.log('counter2', state.counter2);
});

state.counter1++;
state.counter1++;

state.counter2++;
state.counter2++;
```
Output:
```
counter1 0
counter2 0
counter1 1 <-- sync reaction
counter1 2 <-- sync reaction
counter2 2 <-- auto batched
```

##### Example #2 (with react)

```typescript jsx
class SomeCoponentState {
    value = '';
    
    constructor() {
        reactive(this);

        markSynchronousReactions(this, 'value');
    }
    
    handleChange = (e) => {
        this.value = e.target.value;
    }
}

const SomeCoponent = observer(() => {
    const [state] = useState(() => new SomeCoponentState());
    
    return <input value={state.value} onChange={state.handleChange} />
});
```

