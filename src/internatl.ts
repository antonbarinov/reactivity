import { reactiveSubscribe } from './index';

export interface EnhFunction extends Function {
    __subscribedTo: Set<IReactiveVariable>;
    __isAutorun: boolean;
}

export interface IReactiveVariable {
    value: any;
    prevValue: any;
    subscribers: Set<Function>;
    dependenciesChanged?: boolean;
    watchers?: Set<IReactiveVariable>;
    syncReactions?: boolean;
    mapSetVars?: Map<object | string, IReactiveVariable>;
}

export const reactiveVariablesChangedQueue = new Set<IReactiveVariable>();

export function watchersCheck(reactiveVariable: IReactiveVariable) {
    function check(r: IReactiveVariable) {
        r?.watchers?.forEach((dep) => {
            dep.dependenciesChanged = true;
            pushReaction(dep);
            check(dep);
        });
    }

    check(reactiveVariable);
}

export function pushReaction(reactiveVariable: IReactiveVariable) {
    reactiveVariablesChangedQueue.add(reactiveVariable);
}

const reactiveVariablesWeakMap = new WeakMap<object, Map<string, IReactiveVariable>>();
export function getReactiveVariable<T extends object, K extends keyof T>(target: T, key: K) {
    const reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) return  null;

    return  reactiveTargetMap.get(key as string);
}

export function getSetReactiveVariable<T extends object, K extends keyof T>(target: T, key: K, reactiveVariable: IReactiveVariable) {
    let reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) {
        reactiveTargetMap = new Map();
        reactiveVariablesWeakMap.set(target, reactiveTargetMap);
    }
    reactiveTargetMap.set(key as string, reactiveVariable);

    return reactiveTargetMap;
}

export function subscribe(reactiveVariable: IReactiveVariable) {
    const effectFn = reactiveSubscribe.currentEffect;
    if (effectFn && !reactiveVariable.subscribers.has(effectFn)) {
        if (effectFn.__subscribedTo === undefined) {
            effectFn.__subscribedTo = new Set();
        }
    }
    if (effectFn) {
        reactiveVariable.subscribers.add(effectFn);
        effectFn.__subscribedTo.add(reactiveVariable);
    }

    if (reactiveSubscribe.dependencies.length) {
        if (!reactiveVariable.watchers) reactiveVariable.watchers = new Set<IReactiveVariable>();
        for (const dep of reactiveSubscribe.dependencies) {
            reactiveVariable.watchers.add(dep);
        }
    }

    return effectFn;
}

const effectsToExec = new Set<Function>();
export function executeReactiveVariables() {
    reactiveVariablesChangedQueue.forEach((reactiveVariable) => {
        // Run effect only if value really change after auto batching time (setInterval(executeReactiveVariables))
        if (reactiveVariable.prevValue !== reactiveVariable.value) {
            reactiveVariable.subscribers.forEach((effectFn) => {
                effectsToExec.add(effectFn);
            });

            reactiveVariable.prevValue = reactiveVariable.value;
        }
    });

    effectsToExec.forEach((fn) => fn());

    reactiveVariablesChangedQueue.clear();
    effectsToExec.clear();
}

export function executeSYNCSingleReactiveVariable(reactiveVariable: IReactiveVariable) {
    reactiveVariable.subscribers.forEach((effectFn) => {
        effectsToExec.add(effectFn);
    });

    // Remove from async auto batch queue because sync reaction right now
    reactiveVariablesChangedQueue.delete(reactiveVariable);

    effectsToExec.forEach((fn) => fn());
    effectsToExec.clear();
}

export function dataChanged(reactiveVariable: IReactiveVariable) {
    // Computed functions watchers
    watchersCheck(reactiveVariable);

    if (reactiveSubscribe.syncMode || reactiveVariable.syncReactions) {
        executeSYNCSingleReactiveVariable(reactiveVariable);
    } else {
        pushReaction(reactiveVariable);
    }
}
