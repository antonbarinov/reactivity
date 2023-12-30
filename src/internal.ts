import { computedSubscribe, reactiveSubscribe } from './index';

export interface EnhFunction extends Function {
    __subscribedTo: Set<IReactiveVariable>;
    __effectBody: EnhFunction;
}

interface IPairedEffectFnWithReactiveVariable {
    __subscribedValue: any;
}

export interface IReactiveVariable {
    value: any;
    prevValue: any;
    subscribers: Set<EnhFunction>;
    watchers?: Set<IReactiveVariable>;
    syncReactions?: boolean;
    mapSetVars?: Map<object | string, IReactiveVariable>;
    target: any;
    key?: string;
    forceUpdate?: boolean;

    // Computed only section -- BEGIN
    allowComputedSubscribe?: boolean;
    dependenciesChanged?: boolean;
    // Computed only section -- END
}

export const reactiveVariablesChangedQueue = new Set<IReactiveVariable>();
const effectsToExec = new Set<EnhFunction>();
const reactiveVariablesWeakMap = new WeakMap<object, Map<string, IReactiveVariable>>();

export function watchersCheck(reactiveVariable: IReactiveVariable) {
    function check(r: IReactiveVariable) {
        r?.watchers?.forEach((dep) => {
            dep.dependenciesChanged = true; // Used in computed only
            pushReaction(dep);
            check(dep);
        });
    }

    check(reactiveVariable);
}

export function pushReaction(reactiveVariable: IReactiveVariable) {
    reactiveVariablesChangedQueue.add(reactiveVariable);
}

export function getReactiveVariable<T extends object, K extends keyof T>(target: T, key: K) {
    const reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) return  null;

    return  reactiveTargetMap.get(key as string);
}

export function getSetReactiveVariable<T extends object>(target: T, key: string, reactiveVariable: IReactiveVariable) {
    let reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) {
        reactiveTargetMap = new Map();
        reactiveVariablesWeakMap.set(target, reactiveTargetMap);
    }
    reactiveTargetMap.set(key as string, reactiveVariable);

    return reactiveTargetMap;
}

const pairsRootObj = new WeakMap<object, WeakMap<object, any>>();
// Пара объект1 <==> объект2, порядок не имеет значение
function getPairObj<T>(obj1: object, obj2: object): T {
    let wm1 = new WeakMap();
    let wm2 = new WeakMap();
    if (!pairsRootObj.has(obj1)) {
        pairsRootObj.set(obj1, wm1);
    }
    if (!pairsRootObj.has(obj2)) {
        pairsRootObj.set(obj2, wm2);
    }

    wm1 = pairsRootObj.get(obj1);
    wm2 = pairsRootObj.get(obj2);
    let newObj = {};

    if (!wm1.has(obj2)) {
        wm1.set(obj2, newObj);
    }
    if (!wm2.has(obj1)) {
        wm2.set(obj1, newObj);
    }

    return wm1.get(obj2);
}

const pairsRootObjStr = new WeakMap<object, { [k: string]: any }>();
// Пара объект => ключ(строка)
function getPairObjStr<T>(obj: object, key: string): T {
    if (!pairsRootObjStr.has(obj)) {
        pairsRootObjStr.set(obj, {});
    }

    const rootObj = pairsRootObjStr.get(obj);
    rootObj[key] ??= {};

    return rootObj[key];
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

        const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);
        pair.__subscribedValue = reactiveVariable.value;
    }

    if (computedSubscribe.dependencies.length) {
        if (!reactiveVariable.watchers) reactiveVariable.watchers = new Set<IReactiveVariable>();
        for (const dep of computedSubscribe.dependencies) {
            if (dep.allowComputedSubscribe || dep.allowComputedSubscribe === undefined) {
                reactiveVariable.watchers.add(dep);
            }
        }
    }

    return effectFn;
}

export function executeReactiveVariables() {
    reactiveVariablesChangedQueue.forEach((reactiveVariable) => {
        const { value, prevValue } = reactiveVariable;

        // [[[for new Map() and new Set() only]]] Run effect only if value really change after auto batching time (setInterval(executeReactiveVariables))
        if (reactiveVariable.mapSetVars) {
            if (!someChanges(reactiveVariable)) {
                return false;
            }
        }

        reactiveVariable.subscribers.forEach((effectFn) => {
            const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);

            // Если на момент подписки значение изменилось, тогда вызовем реакцию
            if (pair.__subscribedValue !== value || reactiveVariable.forceUpdate) {
                pair.__subscribedValue = value;
                effectsToExec.add(effectFn);
            }
        });

        reactiveVariable.forceUpdate = false;
    });

    reactiveVariablesChangedQueue.clear();

    executeEffects();
}

export function executeSyncSingleReactiveVariable(reactiveVariable: IReactiveVariable) {
    reactiveVariable.subscribers.forEach((effectFn) => {
        reactiveSubscribe.executedEffect = effectFn;
        effectFn();
        reactiveSubscribe.executedEffect = null;
    });

    // Remove from async auto batch queue because sync reaction right now
    reactiveVariablesChangedQueue.delete(reactiveVariable);
}

function executeEffects() {
    try {
        effectsToExec.forEach((fn) => {
            reactiveSubscribe.executedEffect = fn;
            fn();
            reactiveSubscribe.executedEffect = null;
        });
    } catch (e) {
        console.error(e);
    }
    reactiveSubscribe.executedEffect = null;

    effectsToExec.clear();
}

export function dataChanged(reactiveVariable: IReactiveVariable) {
    // Computed functions watchers
    watchersCheck(reactiveVariable);

    if (reactiveSubscribe.syncMode || reactiveVariable.syncReactions) {
        executeSyncSingleReactiveVariable(reactiveVariable);
    } else {
        pushReaction(reactiveVariable);
    }
}


function someChanges(reactiveVariable: IReactiveVariable) {
    let hasChanges = false;
    reactiveVariable.mapSetVars.forEach((rv) => {
        if (rv.prevValue !== rv.value) hasChanges = true;
        rv.prevValue = rv.value
    });

    return hasChanges;
}


interface IComputedData {
    reactiveVariable: IReactiveVariable;
    firstExec: boolean;
}

export function computedInfo(target: object, key: string) {
    const data = getPairObjStr<IComputedData>(target, key);

    if (!data.reactiveVariable) {
        data.reactiveVariable = {
            value: undefined,
            prevValue: undefined,
            subscribers: new Set(),
            target,
            key,
        };

        data.firstExec = false;
    }

    return data;
}
