interface EnhFunction extends Function {
    __subscribedTo: Set<IReactiveVariable>;
    __isAutorun: boolean;
}

interface IReactiveVariable {
    value: any;
    prevValue: any;
    subscribers: Set<Function>;
    dependenciesChanged?: boolean;
    watchers?: Set<IReactiveVariable>;
    syncReactions?: boolean;
}

class ReactiveSubscribe {
    effects: EnhFunction[] = [];
    dependencies: IReactiveVariable[] = [];
    syncMode = false;

    get currentEffect() {
        return this.effects.at(-1);
    }

    start = (effectFn: Function) => {
        this.effects.push(effectFn as EnhFunction);
    }

    stop = () => {
        this.effects.pop();
    }

    startDependency = (reactiveVariable: IReactiveVariable) => {
        this.dependencies.push(reactiveVariable);
    }

    stopDependency = () => {
        this.dependencies.pop();
    }
}

const reactiveVariablesWeakMap = new WeakMap<object, Map<string, IReactiveVariable>>();
function getReactiveVariable<T extends object, K extends keyof T>(target: T, key: K) {
    const reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) return  null;

    return  reactiveTargetMap.get(key as string);
}

export const reactiveSubscribe = new ReactiveSubscribe();
const reactiveVariablesChangedQueue = new Set<IReactiveVariable>();

// Sync reactions
export function markSynchronousReactions<T extends object, K extends keyof T>(target: T, key: K | K[]) {
    if (!Array.isArray(key)) key = [key];
    for (const k of key) {
        const reactiveVariable = getReactiveVariable(target, k);
        if (reactiveVariable) {
            reactiveVariable.syncReactions = true;
        }
    }
}


export function makeSingleReactive(target, key, value, getterTarget?: object) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor.set) return false;

    const reactiveVariable: IReactiveVariable = {
        value,
        prevValue: value,
        subscribers: new Set(),
    };

    let reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) {
        reactiveTargetMap = new Map();
        reactiveVariablesWeakMap.set(target, reactiveTargetMap);
    }
    reactiveTargetMap.set(key, reactiveVariable);

    /**
     * Computed - BEGIN
     */
    if (descriptor.get) {
        const getterFn = descriptor.get;
        let getterFirstRead = false;

        Object.defineProperty(target, key, {
            get() {
                subscribe(reactiveVariable);

                if (!getterFirstRead) {
                    reactiveSubscribe.startDependency(reactiveVariable);
                    reactiveVariable.value = getterFn.call(getterTarget);
                    reactiveSubscribe.stopDependency();
                } else {
                    if (reactiveVariable.dependenciesChanged) {
                        reactiveSubscribe.startDependency(reactiveVariable);
                        reactiveVariable.value = getterFn.call(getterTarget);
                        reactiveSubscribe.stopDependency();
                    }
                }
                getterFirstRead = true;
                reactiveVariable.dependenciesChanged = false;

                return reactiveVariable.value;
            },
            enumerable: false,
            configurable: true,
        })

        return false;
    }
    /**
     * Computed - END
     */

    Object.defineProperty(target, key, {
        get() {
            subscribe(reactiveVariable);

            return reactiveVariable.value;
        },
        set(v) {
            const effectFn = reactiveSubscribe.currentEffect;
            if (effectFn && effectFn.__isAutorun && effectFn.__subscribedTo?.has(reactiveVariable)) {
                console.error('circular change in autorun/reaction detected in', effectFn);
                throw new Error(`circular change in autorun/reaction`);
            }

            const prevValue = reactiveVariable.value;
            const isDataChanged = prevValue !== v;

            if (isDataChanged) {
                reactiveVariable.value = v;

                // Computed functions watchers
                watchersCheck(reactiveVariable);

                if (reactiveSubscribe.syncMode || reactiveVariable.syncReactions) {
                    executeSYNCSingleReactiveVariable(reactiveVariable);
                } else {
                    pushReaction(reactiveVariable);
                }
            }
        },
        enumerable: true,
        configurable: true,
    });
}
const alreadyReactive = new WeakSet();

function watchersCheck(reactiveVariable: IReactiveVariable) {
    function check(r: IReactiveVariable) {
        r?.watchers?.forEach((dep) => {
            dep.dependenciesChanged = true;
            pushReaction(dep);
            check(dep);
        });
    }

    check(reactiveVariable);
}


function subscribe(reactiveVariable: IReactiveVariable) {
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

export function reactive<T extends object, K extends keyof T>(target: T, annotations?: K[], ignore?: boolean) {
    if (alreadyReactive.has(target)) return target;
    alreadyReactive.add(target);

    for (const key in target) {
        if (annotations) {
            if (ignore && annotations.includes(key as any)) continue;
            if (!ignore && !annotations.includes(key as any)) continue;
        }

        if (target.hasOwnProperty(key)) {
            const descriptor = Object.getOwnPropertyDescriptor(target, key);

            if (descriptor.get) {
                makeSingleReactive(target, key, undefined, target);
            } else if (descriptor.set) {
            } else {
                const value = target[key];
                if (typeof value !== 'function') {
                    makeSingleReactive(target, key, target[key]);
                }
            }
        }
    }

    /**
     * Work with getters
     */
    const proto = Object.getPrototypeOf(target);

    if (alreadyReactive.has(proto)) return target;
    alreadyReactive.add(proto);

    if (proto) {
        const keys = Object.getOwnPropertyNames(proto);

        for (const key of keys) {
            if (key === 'constructor') continue;
            if (annotations) {
                if (ignore && annotations.includes(key as any)) continue;
                if (!ignore && !annotations.includes(key as any)) continue;
            }

            const descriptor = Object.getOwnPropertyDescriptor(proto, key);

            if (descriptor.get) {
                makeSingleReactive(proto, key, undefined, target);
            } else if (descriptor.set) {

            } else if (typeof proto[key] !== 'function') {
                makeSingleReactive(proto, key, proto[key]);
            }
        }
    }
    /**
     * Work with getters - END
     */

    return target;
}

function disposeEffect(effectFn: EnhFunction) {
    if (effectFn.__subscribedTo !== undefined) {
        effectFn.__subscribedTo.forEach((reactiveVariable) => {
            reactiveVariable.subscribers.delete(effectFn);
        });
    }
}

export function createReaction(effectFn: Function) {
    function track(fn: Function) {
        reactiveSubscribe.start(effectFn as EnhFunction);
        fn();
        reactiveSubscribe.stop();
    }

    function dispose() {
        disposeEffect(effectFn as EnhFunction);
    }

    return {
        track,
        dispose,
    };
}

export function reaction(trackFn: Function, effectFn: Function, execNow = false) {
    (effectFn as EnhFunction).__isAutorun = true;

    const r = createReaction(effectFn);
    r.track(trackFn);
    if (execNow) effectFn();

    return r.dispose;
}

export function autorun(fn: Function) {
    (fn as EnhFunction).__isAutorun = true;
    const effect = () => {
        reactiveSubscribe.start(effect);
        fn();
        reactiveSubscribe.stop();
    }
    effect();

    function dispose() {
        disposeEffect(effect as any);
    }

    return dispose;
}

export function when(fn: () => boolean) {
    let res: Function = null;
    const promise = new Promise((resolve) => { res = resolve; });

    autorun(() => {
        if (fn()) res(true);
    });

    return promise;
}

function pushReaction(reactiveVariable: IReactiveVariable) {
    reactiveVariablesChangedQueue.add(reactiveVariable);
}

setInterval(executeReactiveVariables);

const effectsToExec = new Set<Function>();
function executeReactiveVariables() {
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

function executeSYNCSingleReactiveVariable(reactiveVariable: IReactiveVariable) {
    reactiveVariable.subscribers.forEach((effectFn) => {
        effectsToExec.add(effectFn);
    });

    // Remove from async auto batch queue because sync reaction right now
    reactiveVariablesChangedQueue.delete(reactiveVariable);

    effectsToExec.forEach((fn) => fn());
    effectsToExec.clear();
}
