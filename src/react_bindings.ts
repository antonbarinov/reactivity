import React, { useRef, useState, useEffect, memo } from 'react';
import { createReaction, reactiveArrays, reactiveSubscribe } from './index';
import { EnhFunction, subscribe } from './internal';

// Fix react crazy idea with freezing props, that cause bugs in some cases when using truly computed getter functions
Object.freeze = (o) => o;

function useForceUpdate() {
    const [_, set] = useState(1);
    const updateRef = useRef(null);
    if (!updateRef.current) {
        updateRef.current = () => set((x) => x + 1);
    }
    return updateRef.current;
}

export function observer<P extends object>(baseComponent: React.FunctionComponent<P>) {
    const wrappedComponent = (...args: any[]) => {
        const forceUpdate = useForceUpdate();
        const reaction = useRef<ReturnType<typeof createReaction>>(null);
        useEffect(() => {
            return () => reaction.current?.dispose();
        }, []);

        if (!reaction) return null;

        if (!reaction.current) {
            reaction.current = createReaction(forceUpdate);
        }

        forceUpdate.__effectBody = baseComponent;

        // Подписка на реактивные пропсы(Arrays) для реакций на .push и т.п., без [...arr]
        const props = args[0];
        for (const k in props) {
            if (!props.hasOwnProperty(k)) continue;
            const v = props[k];
            if (Array.isArray(v)) {
                const rv = reactiveArrays.get(v);
                if (rv) {
                    reactiveSubscribe.start(forceUpdate);
                    subscribe(rv);
                    reactiveSubscribe.stop();
                }
            }
        }

        let output;
        reaction.current.track(() => {
            output = baseComponent.apply(baseComponent, args);
        });

        return output;
    };

    return memo(wrappedComponent) as React.MemoExoticComponent<React.FunctionComponent<P>>;
}
