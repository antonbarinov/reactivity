import { computedSubscribe, reactiveSubscribe } from './index';

export interface EnhFunction extends Function {
    // На какие реактивные переменные подписана данная функция
    __subscribedTo: Set<IReactiveVariable>;
    // Тело функции
    __effectBody: EnhFunction;
}

export interface IPairedEffectFnWithReactiveVariable {
    // Значение в момент подписки
    __subscribedValue: any;

    __circularCalls: number;
}

export interface IPairedComputedWithReactiveVariable {
    // Значение в момент подписки
    __subscribedValue: any;
}

export interface IReactiveVariable {
    // Текущее значение
    value: any;
    // Предыдущее значение (used in Map / Set only)
    prevValue: any;
    // Подписчики на изменение данной реактивной переменной
    subscribers: Set<EnhFunction>;
    // Вызывать ли синхронные реакции на изменение данной реактивной переменной
    syncReactions?: boolean;
    // Родительский объект для данной реактивной переменной
    parentTarget: any;
    // Название свойства в родительском объекте для данной реактивной переменной
    key?: string;
    // Вызывать ли реакции на эту реактивную переменную вне зависимости от того, была ли она реально изменена или нет
    forceUpdate?: boolean;

    /**
     * new Map() and new Get() section only -- BEGIN
     */
    mapSetVars?: Map<object | string, IReactiveVariable>;
    /**
     * new Map() and new Get() section only -- END
     */

    /**
     * Computed only section -- BEGIN
     * */
    // Разрешить подписку на computed функции на реактивные переменные которые она видит в процессе выполнения
    allowComputedSubscribe?: boolean;
    // Были ли изменены зависимости (если да, то будет перевызвана computed функция)
    dependenciesChanged?: boolean;
    // computed функции подписанные на изменение этой реактивной переменной
    computedWatchers?: Set<IReactiveVariable>;
    // Реактивные переменные на которые подписана данная computed функция
    reactiveVariablesInComputed?: Set<IReactiveVariable>;
    isComputed?: boolean;
    /**
     * Computed only section -- END
     * */
}

// Реактивные переменные которые были изменены
export const reactiveVariablesChangedQueue = new Set<IReactiveVariable>();
// Функции которые нужно вызвать в качестве реакций
const effectsToExec = new Set<EnhFunction>();
// Используется в функции getReactiveVariable
const reactiveVariablesWeakMap = new WeakMap<object, Map<string, IReactiveVariable>>();

const syncExecInComputedSet = new Set<IReactiveVariable>();

// Пометить computed'ы следящие за реактивной переменной, что ее зависимости изменились чтобы computed функция была вызвана снова
export function computedFunctionsWatchersCheck(reactiveVariable: IReactiveVariable) {
    function check(r: IReactiveVariable) {
        r?.computedWatchers?.forEach((dep) => {
            // Mark computed that his dependencies has been changes
            dep.dependenciesChanged = true; // Used in computed only
            // When forceUpdate, mark computed to forceUpdate too
            if (reactiveVariable.forceUpdate) {
                dep.forceUpdate = true;
            }

            if (dep.syncReactions) {
                syncExecInComputedSet.add(dep);
            } else {
                pushReaction(dep);
            }

            check(dep);
        });
    }

    check(reactiveVariable);

    // В случае если были обнаружены computed свойства для которых нужны синхронные реакции, вызываем их
    syncExecInComputedSet.forEach((dep) => {
        reactiveVariablesChangedQueue.delete(dep);
        executeEffects(dep);
    })
    syncExecInComputedSet.clear();
}

export function pushReaction(reactiveVariable: IReactiveVariable) {
    reactiveVariablesChangedQueue.add(reactiveVariable);

    // Если после синхронных реакций произошли изменения которые должны реагировать асинхронно,
    // то удаляем эффекты из списка отработанных синхронно
    reactiveVariable.subscribers.forEach((effectFn) => {
        syncEffectsWasExecuted.delete(effectFn);
    });
}

// Получить реактивную переменную зная родительский объект и название свойства (ключ). Например someObj.someVal - getReactiveVariable(someObj, 'someVal')
export function getReactiveVariable<T extends object, K extends keyof T>(target: T, key: K) {
    const reactiveTargetMap = reactiveVariablesWeakMap.get(target);
    if (!reactiveTargetMap) return  null;

    return  reactiveTargetMap.get(key as string);
}

export function setReactiveVariableInMap<T extends object>(target: T, key: string, reactiveVariable: IReactiveVariable) {
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
export function getPairObj<T>(obj1: object, obj2: object): T {
    let wm1 = pairsRootObj.get(obj1);
    let wm2 = pairsRootObj.get(obj2);

    if (!wm1) {
        wm1 = new WeakMap();
        pairsRootObj.set(obj1, wm1);
    }
    if (!wm2) {
        wm2 = new WeakMap();
        pairsRootObj.set(obj2, wm2);
    }

    const newObj = {};

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
        effectFn.__subscribedTo ??= new Set();

        reactiveVariable.subscribers.add(effectFn);
        effectFn.__subscribedTo.add(reactiveVariable);

        const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);
        pair.__subscribedValue = reactiveVariable.value;
    }

    /**
     * Computed subscribe - BEGIN
     */
    if (computedSubscribe.dependencies.length) {
        computedSubscribe.currentDependency.reactiveVariablesInComputed ??= new Set<IReactiveVariable>();
        reactiveVariable.computedWatchers ??= new Set<IReactiveVariable>();

        const pair = getPairObj<IPairedComputedWithReactiveVariable>(computedSubscribe.currentDependency, reactiveVariable);
        pair.__subscribedValue = reactiveVariable.value;

        if (computedSubscribe.currentDependency.allowComputedSubscribe !== false) {
            for (const dep of computedSubscribe.dependencies) {
                if (dep.allowComputedSubscribe || dep.allowComputedSubscribe === undefined) {
                    reactiveVariable.computedWatchers.add(dep);
                    dep.reactiveVariablesInComputed.add(reactiveVariable);
                }
            }
        }
    }
    /**
     * Computed subscribe - END
     */

    return effectFn;
}

function executeReactiveVariables() {
    reactiveVariablesChangedQueue.forEach((reactiveVariable) => {
        const { value } = reactiveVariable;

        // [[[for new Map() and new Set() only]]] Run effect only if value really change after auto batching time (setInterval(executeReactiveVariables))
        if (reactiveVariable.mapSetVars) {
            if (!checkChangesForMapAndSet(reactiveVariable)) {
                return false;
            }
        }

        reactiveVariable.subscribers.forEach((effectFn) => {
            const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);

            // [[[for new Map() and new Set() only]]]
            if (reactiveVariable.mapSetVars) {
                effectsToExec.add(effectFn);
            } else {
                //console.log('reactiveVariable.isComputed', reactiveVariable.isComputed);
                if (reactiveVariable.isComputed) {
                    const newValue = reactiveVariable.parentTarget[reactiveVariable.key];
                    if (pair.__subscribedValue !== newValue) {
                        pair.__subscribedValue = newValue
                        effectsToExec.add(effectFn);
                    }
                }
                // Если на момент подписки значение изменилось, тогда вызовем реакцию
                else if (pair.__subscribedValue !== value || reactiveVariable.forceUpdate || reactiveVariable.dependenciesChanged) {
                    pair.__subscribedValue = value;
                    effectsToExec.add(effectFn);
                }
            }
        });

        if (!reactiveVariable.isComputed) {
            reactiveVariable.forceUpdate = false;
        }
    });

    reactiveVariablesChangedQueue.clear();

    // Вычищаем эффекты, которые были вызваны в ходе синхронных реакций
    syncEffectsWasExecuted.forEach((effectFn) => {
        effectsToExec.delete(effectFn);
    })
    syncEffectsWasExecuted.clear();

    executeEffects();
}

// Does computed dependencies actually change?
export function computedDependenciesIsChanged(reactiveVariable: IReactiveVariable) {
    let hasChanges = false;
    // Does dependencies actually change?
    reactiveVariable.reactiveVariablesInComputed.forEach(rv => {
        // Получаем значение на момент подписки в паре computed и реактивной переменной от которой он зависит
        const pair = getPairObj<IPairedComputedWithReactiveVariable>(reactiveVariable, rv);
        if (rv.value !== pair.__subscribedValue) {
            hasChanges = true;
        }
    })

    return hasChanges;
}

export function createPromise<T = any, RejT = any>() {
    let resolve: (value?: T) => any = null;
    let reject: (reason?: RejT) => any = null;

    const promise = new Promise<T>((res, rej) => {
        resolve = (arg?) => {
            if (resultObj.resolved) return false;

            resultObj.resolved = true;
            res(arg);
        }

        reject = (arg?) => {
            if (resultObj.resolved) return false;

            resultObj.resolved = true;
            resultObj.rejected = true;
            rej(arg);
        }
    });

    const resultObj = {
        promise,
        resolve,
        reject,
        resolved: false,
        rejected: false,
    }

    return resultObj;
}

let execPromiseWatchers = 0;
let execPromise = createPromise();

export function reactionsExecuted() {
    execPromiseWatchers++;
    return execPromise.promise;
}

const syncEffectsWasExecuted = new Set<EnhFunction>();

function executeEffects(reactiveVariable?: IReactiveVariable) {
    const effects = reactiveVariable?.subscribers || effectsToExec;
    const syncMode = reactiveVariable !== undefined;

    try {
        effects.forEach((effectFn) => {
            if (syncMode) {
                // Добавим информация об отработанных синхронных реакциях, чтобы они не были вызваны потом асинхронно
                syncEffectsWasExecuted.add(effectFn);
            }

            reactiveSubscribe.executedEffect = effectFn;
            effectFn();
            reactiveSubscribe.executedEffect = null;
        });
    } catch (e) {
        console.error(e);
    }
    reactiveSubscribe.executedEffect = null;

    if (!syncMode) effectsToExec.clear();

    if (execPromiseWatchers > 0) {
        execPromise.resolve(true);
        execPromise = createPromise();
        execPromiseWatchers--;
    }
}

let execBatchedReactionsInProgress = false;
export function dataChanged(reactiveVariable: IReactiveVariable, forceUpdate = false) {
    if (forceUpdate) reactiveVariable.forceUpdate = forceUpdate;

    // Computed functions watchers
    computedFunctionsWatchersCheck(reactiveVariable);

    if (reactiveSubscribe.syncMode || reactiveVariable.syncReactions) {
        executeEffects(reactiveVariable);

        // Computed check - BEGIN
        if (reactiveVariable.computedWatchers) {
            reactiveVariable.computedWatchers.forEach((rv) => {
                const prevValue = rv.value;
                const newValue = rv.parentTarget[rv.key];
                if (prevValue !== newValue) {
                    executeEffects(rv);
                }
            })
        }
        // Computed check - END
    } else {
        pushReaction(reactiveVariable);

        // Do not used clearTimeout because of performance reason (it calls external WebAPI)
        if (!execBatchedReactionsInProgress) {
            execBatchedReactionsInProgress = true;

            setTimeout(() => {
                execBatchedReactionsInProgress = false;
                executeReactiveVariables();
                checkAsyncCircularDep();
            });
        }
    }
}

export const circularPairsSet = new Set<IPairedEffectFnWithReactiveVariable>();

function checkAsyncCircularDep() {
    const pairs = new Set<IPairedEffectFnWithReactiveVariable>();

    Promise.resolve().then(() => {
        // Наполняет пары ReactiveVariable и EffectFn которые успели встать на очередь выполнение реакций
        reactiveVariablesChangedQueue.forEach((rv) => {
            rv.subscribers.forEach((subscriberFn) => {
                const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(subscriberFn, rv);
                pairs.add(pair);
            })
        });

        circularPairsSet.forEach((circularPair) => {
            // Если последние заподозренные пары на циклическую зависимость не попали в список который мы собрали в pairs, то считаем что подозрение было ложным и сбрасываем счетчик у пары
            if (!pairs.has(circularPair)) {
                circularPair.__circularCalls = 0;
                circularPairsSet.delete(circularPair);
            }
        })
    })
}

// Проверка были ли изменения в new Set() и new Map()
function checkChangesForMapAndSet(reactiveVariable: IReactiveVariable) {
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
            parentTarget: target,
            key,
            isComputed: true,
        };

        data.firstExec = false;
    }

    return data;
}
