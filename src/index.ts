import {
    subscribe,
    executeReactiveVariables,
    getReactiveVariable,
    IReactiveVariable,
    EnhFunction,
    getSetReactiveVariable,
    dataChanged,
} from './internal';

import { setObservableMapSet } from './set';

class ReactiveSubscribe {
    effects: EnhFunction[] = [];
    dependencies: IReactiveVariable[] = [];
    syncMode = false;
    // Currently executed effect
    executedEffect: EnhFunction = null;

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


export function makeSingleReactive(target, key, value, getterTarget?: object) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor.set) return false;

    if (value instanceof Map) {
        return setObservableMapSet(value, 'map');
    } else if (value instanceof Set) {
        return setObservableMapSet(value, 'set');
    } else if (value instanceof WeakMap || value instanceof WeakSet) {
        return false;
    }

    const reactiveVariable: IReactiveVariable = {
        value,
        prevValue: value,
        subscribers: new Set(),
    };

    getSetReactiveVariable(target, key, reactiveVariable);

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
            const effectFn = reactiveSubscribe.currentEffect || reactiveSubscribe.executedEffect;

            // Circular dependency check
            if (effectFn && effectFn.__subscribedTo?.has(reactiveVariable)) {
                let problemFnBody = effectFn;
                if (effectFn.__isAutorun) {
                    problemFnBody = effectFn.__autorunBody;
                }

                disposeEffect(effectFn);
                console.error(
                    'Circular dependency changes detected in:',
                    '\r\n',
                    problemFnBody,
                    '\r\n',
                    'Also this effect ^ was disposed');
                return false;
            }

            const prevValue = reactiveVariable.value;
            const isDataChanged = prevValue !== v;

            if (isDataChanged) {
                reactiveVariable.value = v;

                dataChanged(reactiveVariable);
            }
        },
        enumerable: true,
        configurable: true,
    });
}
const alreadyReactive = new WeakSet();


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
    const r = createReaction(effectFn);
    r.track(trackFn);
    if (execNow) effectFn();

    return r.dispose;
}

export function autorun(fn: Function) {
    function effect() {
        reactiveSubscribe.start(effect);
        fn();
        reactiveSubscribe.stop();
    }
    effect.__autorunBody = fn;
    effect.__isAutorun = true;

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


