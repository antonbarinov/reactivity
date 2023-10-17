import {
    subscribe,
    executeReactiveVariables,
    getReactiveVariable,
    IReactiveVariable,
    EnhFunction,
    getSetReactiveVariable,
    dataChanged, computedInfo,
} from './internal';

import { setObservableMapSet } from './set';

const arrayPrototypes = {
    'push': Array.prototype.push,
    'pop': Array.prototype.pop,
    'shift': Array.prototype.shift,
    'unshift': Array.prototype.unshift,
    'splice': Array.prototype.splice,
    'sort': Array.prototype.sort,
    'reverse': Array.prototype.reverse,
}

class ReactiveSubscribe {
    effects: EnhFunction[] = [];
    dependencies: IReactiveVariable[] = [];
    syncMode = false;
    // Currently executed effect
    executedEffect: EnhFunction = null;

    get currentEffect() {
        return this.effects[this.effects.length - 1];
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

export const reactiveSubscribe = new ReactiveSubscribe();

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

function makeReactiveArray(arr: any[], reactiveVariable: IReactiveVariable) {
    for (const k in arrayPrototypes) {
        arr[k] = function () {
            arrayPrototypes[k].apply(this, arguments);
            reactiveVariable.value = [...this];

            dataChanged(reactiveVariable);
        }
    }
}

export function makeSingleReactive(target: object, key: string, value) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor.set) return false;

    if (value instanceof Map) {
        return setObservableMapSet(value, 'map');
    } else if (value instanceof Set) {
        return setObservableMapSet(value, 'set');
    } else if (value instanceof WeakMap) {
        return setObservableMapSet(value, 'weak_map');
    } else if (value instanceof WeakSet) {
        return setObservableMapSet(value, 'weak_set');
    }

    /**
     * Computed - BEGIN
     */
    if (descriptor.get) {
        const getterFn = descriptor.get;

        Object.defineProperty(target, key, {
            get() {
                const computedData = computedInfo(this, key);
                const { reactiveVariable } = computedData;

                subscribe(reactiveVariable);

                if (!computedData.firstExec) {
                    reactiveSubscribe.startDependency(reactiveVariable);
                    reactiveVariable.value = getterFn.call(this);
                    reactiveSubscribe.stopDependency();
                } else {
                    if (reactiveVariable.dependenciesChanged) {
                        reactiveSubscribe.startDependency(reactiveVariable);
                        reactiveVariable.value = getterFn.call(this);
                        reactiveSubscribe.stopDependency();
                    }
                }
                computedData.firstExec = true;

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

    const reactiveVariable: IReactiveVariable = {
        value,
        prevValue: value,
        subscribers: new Set(),
        target,
        key,
    };

    getSetReactiveVariable(target, key, reactiveVariable);

    if (!descriptor.get) {
        if (Array.isArray(target[key])) {
            const arr = target[key];
            makeReactiveArray(arr, reactiveVariable);
        }
    }


    Object.defineProperty(target, key, {
        get() {
            subscribe(reactiveVariable);

            return reactiveVariable.value;
        },
        set(v) {
            const effectFn = reactiveSubscribe.currentEffect || reactiveSubscribe.executedEffect;

            // Circular dependency check
            /*
            if (effectFn && effectFn.__subscribedTo?.has(reactiveVariable)) {
                let problemFnBody = effectFn.__effectBody || effectFn;

                let circularTracker = circularTrackerMap.get(effectFn);
                if (!circularTracker) {
                    circularTracker = new WeakSet<IReactiveVariable>();
                    circularTrackerMap.set(effectFn, circularTracker);
                }

                // Circular dependency previously was marked
                if (circularTracker.has(reactiveVariable)) {
                    disposeEffect(effectFn);

                    console.error('Circular dependency changes detected in:');
                    console.trace(problemFnBody);
                    console.error(
                        'Also this effect ^ was disposed',
                        '\r\n',
                        'target:', target,
                        '\r\n',
                        'key:', key,
                    );

                    return false;
                } else {
                    // Mark circular dependency
                    circularTracker.add(reactiveVariable);
                }
            }*/

            const prevValue = reactiveVariable.value;
            const isDataChanged = prevValue !== v;

            if (isDataChanged) {
                reactiveVariable.value = v;

                if (Array.isArray(v)) {
                    makeReactiveArray(v, reactiveVariable);
                }

                dataChanged(reactiveVariable);
            }
        },
        enumerable: true,
        configurable: true,
    });
}
const alreadyReactive = new WeakSet();

const circularTrackerMap = new WeakMap<EnhFunction, WeakSet<IReactiveVariable>>();


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
                makeSingleReactive(target, key, undefined);
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
                makeSingleReactive(proto, key, undefined);
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
    const circularTracker = circularTrackerMap.get(effectFn);

    if (effectFn.__subscribedTo !== undefined) {
        effectFn.__subscribedTo.forEach((reactiveVariable) => {
            reactiveVariable.subscribers.delete(effectFn);

            if (circularTracker) {
                circularTracker.delete(reactiveVariable);
            }
        });
    }

    circularTrackerMap.delete(effectFn);
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

export function reaction(trackFn: Function, effectFn: (disposeFn: Function) => any, execNow = false) {
    const r = createReaction(effect);

    function effect() {
        effectFn(r.dispose);
    }
    effect.__effectBody = effectFn;

    r.track(trackFn);
    if (execNow) effect();

    return r.dispose;
}

export function autorun(fn: (disposeFn: Function) => any) {
    function effect() {
        reactiveSubscribe.start(effect);
        fn(dispose);
        reactiveSubscribe.stop();
    }
    effect.__effectBody = fn;

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

setInterval(executeReactiveVariables);


