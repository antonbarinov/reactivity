import {
    subscribe,
    getReactiveVariable,
    IReactiveVariable,
    EnhFunction,
    setReactiveVariableInMap,
    dataChanged, computedInfo, getPairObj, IPairedEffectFnWithReactiveVariable, circularPairsSet, IPairedComputedWithReactiveVariable, computedDependenciesIsChanged, createPromise,
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
    private __pauseTracking = false;

    get currentEffect() {
        if (this.__pauseTracking) return null;
        return this.effects[this.effects.length - 1];
    }

    start = (effectFn: Function) => {
        this.effects.push(effectFn as EnhFunction);
    }

    stop = () => {
        this.resumeTracking();
        this.effects.pop();
    }

    pauseTracking = () => {
        this.__pauseTracking = true;
    }

    resumeTracking = () => {
        this.__pauseTracking = false;
    }
}

class ComputedSubscribe {
    dependencies: IReactiveVariable[] = [];
    private __pauseTracking = false;

    get currentDependency() {
        if (this.__pauseTracking) return null;
        return this.dependencies[this.dependencies.length - 1];
    }

    startDependency = (reactiveVariable: IReactiveVariable) => {
        this.dependencies.push(reactiveVariable);
    }

    stopDependency = () => {
        this.dependencies.pop();
    }

    pauseTracking = () => {
        this.__pauseTracking = true;
    }

    resumeTracking = () => {
        this.__pauseTracking = false;
    }
}

export const computedSubscribe = new ComputedSubscribe();
export const reactiveSubscribe = new ReactiveSubscribe();

// Sync reactions
export function markSynchronousReactions<T extends object, K extends keyof T>(target: T, key: K | K[]) {
    markReactions(target, key, true);
}

// Sync reactions
function markReactions<T extends object, K extends keyof T>(target: T, key: K | K[], sync: boolean) {
    if (!Array.isArray(key)) key = [key];
    for (const k of key) {
        const reactiveVariable = getReactiveVariable(target, k);
        if (reactiveVariable) {
            reactiveVariable.syncReactions = sync;
        } else {
            const computed = computedInfo(target, k as string);
            computed.reactiveVariable.syncReactions = sync;
        }
    }
}

// Back to async reactions
export function unMarkSynchronousReactions<T extends object, K extends keyof T>(target: T, key: K | K[]) {
    markReactions(target, key, false);
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

function makeSingleReactive(target: object, key: string, value) {
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

                const effectFn = reactiveSubscribe.currentEffect;

                let hasChanges = false;
                if (!reactiveVariable.forceUpdate && computedData.firstExec && reactiveVariable.dependenciesChanged) {
                    // Does dependencies actually change?
                    hasChanges = computedDependenciesIsChanged(reactiveVariable);
                }

                if (!computedData.firstExec || hasChanges || reactiveVariable.forceUpdate) {
                    reactiveSubscribe.pauseTracking();
                    computedSubscribe.startDependency(reactiveVariable);

                    reactiveVariable.allowComputedSubscribe = true;
                    reactiveVariable.value = getterFn.call(this);

                    // When value for __subscribedValue was not defined (first time getterFn call) on top call subscribe(reactiveVariable); then define it here
                    if (effectFn && !computedData.firstExec) {
                        const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);
                        pair.__subscribedValue = reactiveVariable.value;
                    }

                    computedSubscribe.stopDependency();
                    reactiveSubscribe.resumeTracking();
                    reactiveVariable.forceUpdate = false;
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
        parentTarget: target,
        key,
    };

    setReactiveVariableInMap(target, key, reactiveVariable);

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

            const prevValue = reactiveVariable.value;
            const isDataChanged = prevValue !== v;

            // Circular dependency check
            if (effectFn && effectFn.__subscribedTo?.has(reactiveVariable)) {
                let problemFnBody = effectFn.__effectBody || effectFn;

                const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);
                pair.__circularCalls ??= 0;
                if (isDataChanged) pair.__circularCalls++;
                circularPairsSet.add(pair);

                // Circular dependency previously was marked
                if (pair.__circularCalls > 1) {
                    disposeEffect(effectFn);

                    // @ts-ignore
                    if (!__VITEST__) {
                        console.error('Circular dependency changes detected in:');
                        console.trace(problemFnBody);
                        console.error(
                            'Also this effect ^ was disposed',
                            '\r\n',
                            'target:', target,
                            '\r\n',
                            'key:', key,
                        );
                        console.log(reactiveVariable);
                    }

                    return false;
                }
            }

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

interface ILastReadFn {
    value: AnyFn;
    context: object;
}

export function reactive<T extends object, K extends keyof T>(target: T, annotations?: K[], ignore?: boolean) {
    if (alreadyReactive.has(target)) return target;
    alreadyReactive.add(target);

    for (const key in target) {
        if (annotations) {
            if (ignore && annotations.includes(key as any)) continue;
            if (!ignore && !annotations.includes(key as any)) continue;
        }

        if (!target.hasOwnProperty(key)) continue;
        const descriptor = Object.getOwnPropertyDescriptor(target, key);

        if (descriptor.get) {
            makeSingleReactive(target, key, undefined);
        } else if (descriptor.set) {
        } else if (typeof target[key] !== 'function') {
            makeSingleReactive(target, key, target[key]);
        } else if (typeof target[key] === 'function') {
            const fn: ILastReadFn = {
                value: target[key] as AnyFn,
                context: target
            };

            Object.defineProperty(target, key, {
                get() {
                    lastReadFn = fn;
                    return fn.value;
                },
                set(v) {
                    fn.value = v;
                },
            });
        }
    }

    /**
     * Work with getters -- BEGIN
     */
    const proto = Object.getPrototypeOf(target);

    if (alreadyReactive.has(proto)) return target;
    alreadyReactive.add(proto);

    if (proto) {
        const keys = Object.getOwnPropertyNames(proto);

        for (const key of keys) {
            if (key === 'constructor' || key === '__proto__') continue;

            if (annotations) {
                if (ignore && annotations.includes(key as any)) continue;
                if (!ignore && !annotations.includes(key as any)) continue;
            }

            if (!proto.hasOwnProperty(key)) continue;
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
    effectFn.__subscribedTo?.forEach((reactiveVariable) => {
        reactiveVariable.subscribers.delete(effectFn);
    });

    effectFn.__effectBody = undefined;
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

let whenTickPromiseInterval = null;
let whenTickPromiseSubscribers = 0;
let whenTickPromise: ReturnType<typeof createPromise> = null;

export function when(fn: () => boolean, timeout?: number): Promise<any> {
    const whenPromise = createPromise();
    whenTickPromiseSubscribers++;
    const hasTimeout = timeout > 0;

    function done(reject = false) {
        whenTickPromiseSubscribers--;
        if (whenTickPromiseSubscribers === 0) {
            if (whenTickPromise) whenTickPromise.resolve();
            clearInterval(whenTickPromiseInterval);
        }
        if (reject) {
            whenPromise.reject(`[when] rejected with timeout`);
        } else {
            whenPromise.resolve(true);
        }
    }

    const dispose = autorun((disposeFn) => {
        if (fn() && !whenPromise.resolved) {
            disposeFn();
            done();
        }
    });

    if (!whenPromise.resolved && whenTickPromiseSubscribers) {
        if (whenTickPromiseSubscribers === 1) {
            whenTickPromise = createPromise();

            whenTickPromiseInterval = setInterval(() => {
                whenTickPromise.resolve();
                whenTickPromise = createPromise();
            }, 10);
        }

        (async () => {
            while (!whenPromise.resolved) {
                await whenTickPromise.promise;
                if (hasTimeout) {
                    timeout -= 10;
                    if (timeout <= 0) {
                        dispose();
                        done(true); // reject
                    }
                }

                if (!whenPromise.resolved && fn()) {
                    dispose();
                    done();
                }
            }
        })();
    }

    return whenPromise.promise;
}

type AnyFn = (...args: any[]) => any;

const actionListeners = new WeakMap<AnyFn, Set<AnyFn>>();
let lastReadFn: ILastReadFn = null;

export function actionSubscribe(action: AnyFn, cb: (unsubscribeFn: Function) => any) {
    if (!lastReadFn || lastReadFn.value !== action) {
        throw new Error(`Can't subscribe to function: ${action}\r\n Check that is arrow function and reactive`);
    }

    if (actionListeners.has(action)) {
        const listeners = actionListeners.get(action);
        listeners.add(cb);

        return () => actionUnsubscribe(action, cb);
    }

    const fn = lastReadFn.value;
    const fnContext = lastReadFn.context;

    const wrapper = () => {
        const result = fn.apply(fnContext, arguments);

        const listeners = actionListeners.get(wrapper);
        listeners.forEach((cb) => cb(unsubscribe));

        return result;
    }

    function unsubscribe() {
        actionUnsubscribe(wrapper, cb);
    }

    lastReadFn.value = wrapper;

    const listeners = new Set<AnyFn>();
    actionListeners.set(wrapper, listeners);
    listeners.add(cb);

    return unsubscribe;
}

export function actionUnsubscribe(action: AnyFn, cb: AnyFn) {
    const listeners = actionListeners.get(action);
    if (listeners) listeners.delete(cb);
}

