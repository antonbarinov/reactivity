import { useRef, useState, useEffect, memo } from 'react';
import { createReaction } from './index';

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

export function observer(baseComponent) {
    const wrappedComponent = (...args) => {
        const forceUpdate = useForceUpdate();
        const reaction = useRef(null);
        useEffect(() => {
            return () => reaction.current?.dispose();
        }, []);

        if (!reaction) return null;

        if (!reaction.current) {
            reaction.current = createReaction(forceUpdate);
        }

        let output;
        reaction.current.track(() => {
            output = baseComponent(...args);
        });

        return output;
    };

    return memo(wrappedComponent);
}
