---
outline: deep
---

# observer()

The `observer` HoC automatically subscribes React components to any observables that are used during rendering. As a result, components will automatically re-render when relevant observables change. It also makes sure that components don't re-render when there are no relevant changes. So, observables that are accessible by the component, but not actually read, won't ever cause a re-render.

In practice this makes applications very well optimized out of the box and they typically don't need any additional code to prevent excessive rendering.

- **Type**
```typescript
declare function observer<P extends object>(baseComponent: React.FunctionComponent<P>): React.MemoExoticComponent<React.FunctionComponent<P>>;
```

## Examples

##### Basic example
```typescript jsx
import React, { useState, useEffect } from 'react';
import { reactive } from 'reactive';
import { observer } from 'reactive/react_bindings';

import styles from './styles.module.scss';

interface ITimerProps {
    prop1: number;
    prop2: string;
}
export const Timer = observer((props: ITimerProps) => {
    const { prop1, prop2 } = props;
    const [state] = useState(() => new TimerState());
    useEffect(state.updateTimeEffect, []);
    
    return (
        <div className={styles.container}>
            <div>Current time: {state.time}</div>
            <div>prop1: {prop1}</div>
            <div>prop1: {prop2}</div>
        </div>
    )
});

class TimerState {
    time = new Date().toLocaleString();

    constructor() {
        reactive(this);
    }
    
    updateTimeEffect = () => {
        const interval = setInterval(() => {
            this.time = new Date().toLocaleString();
        }, 500);
        
        return () => {
            clearInterval(interval);
        }
    }

}
```
