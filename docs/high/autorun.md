---
outline: deep
---

# autorun()
The autorun function accepts one function that should run every time anything it observes changes.
It also runs once when you create the autorun itself. 
It only responds to changes that we mark as reactive.

- **Type**
```typescript
declare function autorun(effect: (disposeFn: Function) => any): () => void;
```
- **Note**

To prevent circular dependencies don't use mutations inside `effect` function.


## Examples

##### Example #1
```typescript
class Animal {
    name = '';
    energyLevel = 100;

    constructor(name) {
        this.name = name;
        this.energyLevel = 100;
        reactive(this);
    }

    reduceEnergy() {
        this.energyLevel -= 10;
    }

    get isHungry() {
        return this.energyLevel < 50;
    }
}

const giraffe = new Animal("Gary");

autorun(() => {
    console.log("Energy level:", giraffe.energyLevel);
});

autorun(() => {
    if (giraffe.isHungry) {
        console.log("Now I'm hungry!");
    } else {
        console.log("I'm not hungry!");
    }
});

console.log("Now let's change state!");
for (let i = 0; i < 10; i++) {
    giraffe.reduceEnergy();
}
```
Sine reactions are async by default, output will be:
```
Energy level: 100
I'm not hungry!
Now let's change state!
Now I'm hungry!
Energy level: 0
```

##### Example #2 (sync)
```typescript
class Animal {
    name = '';
    energyLevel = 100;

    constructor(name) {
        this.name = name;
        this.energyLevel = 100;
        reactive(this);
        /*
        Now all reactions on change "energyLevel" will be synchonous, 
        including computed's that read inside it.
         */
        markSynchronousReactions(this, 'energyLevel');
    }

    reduceEnergy() {
        this.energyLevel -= 10;
    }

    get isHungry() {
        return this.energyLevel < 50;
    }
}

const giraffe = new Animal("Gary");

autorun(() => {
    console.log("Energy level:", giraffe.energyLevel);
});

autorun(() => {
    if (giraffe.isHungry) {
        console.log("Now I'm hungry!");
    } else {
        console.log("I'm not hungry!");
    }
});

console.log("Now let's change state!");
for (let i = 0; i < 10; i++) {
    giraffe.reduceEnergy();
}
```
Now `energyLevel` react on changes synchronously, output will be:
```
Energy level: 100
I'm not hungry!
Now let's change state!
Energy level: 90
Energy level: 80
Energy level: 70
Energy level: 60
Energy level: 50
Energy level: 40
Now I'm hungry!
Energy level: 30
Energy level: 20
Energy level: 10
Energy level: 0
```

##### Example #3 (dispose)

````typescript
class State {
    count = 1;
    
    constructor() {
        reactive(this);
        markSynchronousReactions(this, 'count');
    }
}

const state = new State();

// Variant 1
const disposeFn = autorun(() => {
    console.log(state.count);
    if (state.count > 2) {
        // After that this autorun no longer active
        disposeFn(); 
    }
});

// Variant 2
autorun((disposeFn) => {
    console.log(state.count);
    if (state.count > 2) {
        // After that this autorun no longer active
        disposeFn();
    }
});

for (let i = 0; i < 10; i++) {
    state.count++;
}
````
Output will be:
```
1
1
2
2
3
3
```
