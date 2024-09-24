---
outline: deep
---

# reaction()
The reaction function accepts two functions, the first(`trackFn`) for spy and track observables, 
and the second(`effectFn`) is effect that fires when any of observables inside `trackFn` was changed.
Also it has third argument(`execNow`) for fire `execNow` immediately when initialized(*just like `autorun`*)

Returns dispose function.
- **Type**
```typescript
declare function reaction(
    trackFn: Function, 
    effectFn: (disposeFn: Function) => any, 
    execNow?: boolean): () => void;
```
- **Note**

To prevent circular dependencies don't mutate observables that tracked by `trackFn` inside `effectFn` function.


## Examples

##### Example #1

```typescript
const sleep = (ms = 0) => new Promise(res => setTimeout(res, ms));

class State {
    counter = 0;
    counter2 = 0;

    constructor() {
        reactive(this);
    }
}

const state = new State();

const dispose = reaction(() => [state.counter], (disposeFn) => {
    console.log('counter', state.counter, 'counter2', state.counter2);

    // stop reaction and unsubscribe if needed
    // disposeFn();
});

(async () => {
    for (let i = 0; i < 5; i++) {
        state.counter++;
        await sleep(1);
    }

    for (let i = 0; i < 5; i++) {
        state.counter2++;
        await sleep(1);
    }
    
    // stop reaction and unsubscribe if needed
    // dispose();
})();
```
Output:
```
counter 1 counter2 0
counter 2 counter2 0
counter 3 counter2 0
counter 4 counter2 0
counter 5 counter2 0
```
As you can see, `effectFn` was reacting only on `state.counter` changes.

##### Example #2

```typescript
const sleep = (ms = 0) => new Promise(res => setTimeout(res, ms));

class State {
    counter = 0;
    counter2 = 0;

    constructor() {
        reactive(this);
    }
}

const state = new State();

const dispose = reaction(() => [state.counter, state.counter2], (disposeFn) => {
    console.log('counter', state.counter, 'counter2', state.counter2);

    // stop reaction and unsubscribe if needed
    // disposeFn();
});

(async () => {
    for (let i = 0; i < 5; i++) {
        state.counter++;
        await sleep(1);
    }

    for (let i = 0; i < 5; i++) {
        state.counter2++;
        await sleep(1);
    }

    // stop reaction and unsubscribe if needed
    // dispose();
})();
```
Output:
```
counter 1 counter2 0
counter 2 counter2 0
counter 3 counter2 0
counter 4 counter2 0
counter 5 counter2 0
counter 5 counter2 1
counter 5 counter2 2
counter 5 counter2 3
counter 5 counter2 4
counter 5 counter2 5
```
As you can see, `effectFn` was reacting both on `state.counter` and `state.counter2` changes.

##### Example #3

```typescript
const sleep = (ms = 0) => new Promise(res => setTimeout(res, ms));

class State {
    page = 1;
    searchFilter = '';
    items = [];

    constructor() {
        reactive(this);

        reaction(() => [state.page, state.searchFilter], (disposeFn) => {
            this.fetchItems();
        });
    }
    
    fetchItems = async () => {
        this.items = await api(`/api/items`).qs({ 
            page: this.page, 
            filter: this.searchFilter }).send();
    }
}

const state = new State();

(async () => {
    for (let i = 0; i < 5; i++) {
        state.page++;
        await sleep(100);
    }
})();
```
When we change `page` or `searchFilter` automatically called `fetchItems` and load actual data. 
In this case we ignore such things as debounce and/or race condition.
