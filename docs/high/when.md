---
outline: deep
---

# async when()
`when` observes and runs the given `predicate` function until it returns `true`. 
Once that happens, promise will resolved. 
Also you can provide second argument `timeout`(*in milliseconds*) and if `predicate` doen't return `true` for give period of time, promise will `rejected`.
- **Type**
```typescript
declare function when(predicate: () => boolean, timeout?: number): Promise<any>;
```
- **Note**

For performance reasons accuracy of `timeout` around ±20 milliseconds.
It works also with non observables, 
because under the hood `predicate` function checked every ~10ms in addition to `autorun` check.


## Examples

##### Example #1

```typescript
const sleep = (ms = 0) => new Promise(res => setTimeout(res, ms));

class State {
    counter = 0;

    constructor() {
        reactive(this);
    }
}

const state = new State();

(async () => {
    console.log('waiting...');
    await when(() => state.counter > 10);
    console.log('when resolved');
})();

setTimeout(() => {
    state.counter = 100;
}, 1000);
```
Output after 1000 ms:
```
waiting...
// after 1000 ms
when resolved
```

##### Example #2 (with `timeout`)

```typescript
const sleep = (ms = 0) => new Promise(res => setTimeout(res, ms));

class State {
    counter = 0;

    constructor() {
        reactive(this);
    }
}

const state = new State();

(async () => {
    console.log('waiting...');
    await when(() => state.counter > 10, 100);
    console.log('when resolved');
})();

setTimeout(() => {
    state.counter = 100;
}, 1000);
```
Output after ~100 ms because of `timeout`:
```
waiting...
// after ~100 ms of timeout
[ERROR]: Uncaught (in promise) [when] rejected with timeout
```

##### Example #3 (with non observables)

```typescript
const sleep = (ms = 0) => new Promise(res => setTimeout(res, ms));

let counter = 0;

(async () => {
    console.log('waiting...');
    await when(() => counter > 10);
    console.log('when resolved');
})();

setTimeout(() => {
    counter = 100;
}, 1000);
```
Output after 1000 ms:
```
waiting...
// after 1000 ms
when resolved
```
As you can see, you can use it to wait for anything.
