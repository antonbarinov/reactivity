---
outline: deep
---

# reactive()
Make class/object reactive. 

- **Type**
```typescript
declare function reactive<T extends object, K extends keyof T>(target: T, annotations?: K[], ignore?: boolean): T;
```
- **Details**

There is **no deep** and it not affect nested properties. 
Only high-level properties become reactive.
Our recommended is not use nested reactivity by default.

Returns original object given to a `target` parameter.


## Examples

##### Object (**not** recommended)
```typescript
const obj = reactive({ count: 1 });
obj.count++;
```
##### Object with nested properties (**not** recommended)
```typescript
const obj = reactive({ 
    nested: { 
        count: 1 
    } 
});
obj.nested.count++; // does NOT trigger change
obj.nested = { count: 100 }; // does trigger change
```

##### Class (recommended)
```typescript
class State {
    count = 1;
    
    constructor() {
        reactive(this);
    }
    
    // Will be computed property and will be cached
    get double() {
        return this.count * 2;
    }

    incr = () => {
        this.count++;
    }
}

const state = new State();
state.count++;
state.incr();
```

##### Class with annotations
```typescript
class State {
    count = 1; // reactive
    name = 'Tom'; // reactive
    email = ''; // NON reactive
    
    constructor() {
        // make only "count" and "name" reactive
        reactive(this, ['count', 'name']);
    }

    // NON computed property and will not be cached
    get double() {
        return this.count * 2;
    }
    
    incr = () => {
        this.count++;
    }
}

const state = new State();
state.count++;
state.incr();
```

##### Class with annotations (ignore)
```typescript
class State {
    count = 1; // reactive
    name = 'Tom'; // NON reactive
    email = ''; // NON reactive
    
    constructor() {
        // make all reactive except this fields (['email', 'name'])
        reactive(this, ['email', 'name'], true);
    }

    // Will be computed property and will be cached
    get double() {
        return this.count * 2;
    }

    incr = () => {
        this.count++;
    }
}

const state = new State();
state.count++;
state.incr();
```

##### Class with nested reactive entities

```typescript
class State {
    showModal = new WithBoolean();
    form = {
        firstName: new FormField(),
        lastName: new FormField(),
        banned: new WithBoolean(),
    }

    constructor() {
        reactive(this);
    }
}

class WithBoolean {
    value = false;
    
    constructor(initialValue = false) {
        reactive(this);
        this.value = initialValue;
    }
    
    setTrue = () => {
        this.value = true;
    }

    setFalse = () => {
        this.value = false;
    }

    toggle = () => {
        this.value = !this.value;
    }

    setValue = (value: boolean) => {
        this.value = value;
    }
}

class FormField {
    value = '';

    constructor(initialValue = '') {
        reactive(this);
        // Useful for react to make reactions on "value" changes is synchronous
        markSynchronousReactions(this, 'value');
        this.value = initialValue;
    }
    
    handleInputChange = (e) => {
        this.value = e.target.value;
    }
}

const state = new State();
state.showModal.setTrue();
```

