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
}

class ComputedSubscribe {
    dependencies: IReactiveVariable[] = [];

    get currentDependency() {
        return this.dependencies[this.dependencies.length - 1];
    }

    startDependency = (reactiveVariable: IReactiveVariable) => {
        this.dependencies.push(reactiveVariable);
    }

    stopDependency = () => {
        this.dependencies.pop();
    }
}

export const computedSubscribe = new ComputedSubscribe();
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

export const reactiveArrays = new WeakMap<object, IReactiveVariable>();
for (const k in arrayPrototypes) {
    Array.prototype[k] = function () {
        const rv = reactiveArrays.get(this);
        const result = arrayPrototypes[k].apply(this, arguments);
        if (rv) {
            rv.forceUpdate = true;
            dataChanged(rv);
        }

        return result;
    }
}

function makeReactiveArray(arr: any[], reactiveVariable: IReactiveVariable) {
    reactiveArrays.set(arr, reactiveVariable);
}

export function makeSingleReactive(target: object, key: string, value) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor.set) return false;

    const constructorName = target.constructor.name;

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

                if (!computedData.firstExec || (computedData.firstExec && reactiveVariable.dependenciesChanged)) {
                    computedSubscribe.startDependency(reactiveVariable);
                    reactiveVariable.allowComputedSubscribe = true;
                    reactiveVariable.value = getterFn.call(this);
                    computedSubscribe.stopDependency();
                }
                computedData.firstExec = true;

                reactiveVariable.dependenciesChanged = false;

                //console.log(`[read getter] ${constructorName}.${key}`, reactiveVariable.value);

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
            makeReactiveArray(target[key], reactiveVariable);
        }
    }


    Object.defineProperty(target, key, {
        get() {
            subscribe(reactiveVariable);

            //console.log(`[read] ${constructorName}.${key}`);

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

                //console.log(`[write] ${constructorName}.${key} = `, v);

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

    effectFn.__subscribedTo?.forEach((reactiveVariable) => {
        reactiveVariable.subscribers.delete(effectFn);

        if (circularTracker) {
            circularTracker.delete(reactiveVariable);
        }
    });

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

export function when(fn: () => boolean, interval?: number) {
    let res: Function = null;
    const promise = new Promise((resolve) => { res = resolve; });
    let resolved = false;

    autorun(() => {
        if (fn()) {
            res(true);
            resolved  = true;
        }
    });


    (async () => {
        if (interval && !resolved) {
            while (!fn()) {
                await sleep(interval);
            }

            res(true);
        }
    })();

    return promise;
}

function sleep(ms = 0) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

type AnyFn = (...args: any[]) => any;

const actionListeners = new WeakMap<AnyFn, Set<AnyFn>>();

export function actionSubscribe(action: AnyFn, cb: AnyFn) {
    let listeners = actionListeners.get(action);
    if (!listeners) {
        listeners = new Set<AnyFn>();
        actionListeners.set(action, listeners);
    }

    listeners.add(cb);

    return () => actionUnsubscribe(action, cb);
}

export function actionUnsubscribe(action: AnyFn, cb: AnyFn) {
    const listeners = actionListeners.get(action);
    if (listeners) listeners.delete(cb);
}

export function decorateActions(context: object) {
    const constructorName = context.constructor.name;

    for (const k in context) {
        const val = context[k];
        if (typeof val === 'function') {
            function wrapper() {
                //console.log(`${constructorName}.${k} executed`);

                const listeners = actionListeners.get(context[k]);

                if (listeners) {
                    listeners.forEach((cb) => cb());
                }

                return val.apply(this, arguments);
            }

            context[k] = wrapper;
        }
    }
}


