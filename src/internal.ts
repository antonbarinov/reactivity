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
    __circularMark: boolean;
}

export interface IReactiveVariable {
    // Текущее значение
    value: any;
    // Предыдущее значение
    prevValue: any;
    // Подписчики на изменение данной реактивной переменной
    subscribers: Set<EnhFunction>;
    // Вызывать ли синхронные реакции на изменение данной реактивной переменной
    syncReactions?: boolean;
    // Родительский объект для данной реактивной переменной
    parentTarget: any;
    // Название свойста в родительском объекте для данной реактивной переменной
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
    // Разрешить подписку на computed функции на реактивные перменные которые она видит в процессе выполнения
    allowComputedSubscribe?: boolean;
    // Были ли изменены зависимости (если да, то буду перевызвана computed функция)
    dependenciesChanged?: boolean;
    // computed функции подписанные на изменение этой реактивной переменной
    computedWatchers?: Set<IReactiveVariable>;
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

// Пометить computed'ы следящие за реактивной переменной, что ее зависимости изменились чтобы computed функция была вызвана снова
export function computedFunctionsWatchersCheck(reactiveVariable: IReactiveVariable) {
    function check(r: IReactiveVariable) {
        r?.computedWatchers?.forEach((dep) => {
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

    if (computedSubscribe.dependencies.length) {
        reactiveVariable.computedWatchers ??= new Set<IReactiveVariable>();
        for (const dep of computedSubscribe.dependencies) {
            if (dep.allowComputedSubscribe || dep.allowComputedSubscribe === undefined) {
                reactiveVariable.computedWatchers.add(dep);
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
            if (!checkChangesForMapAndSet(reactiveVariable)) {
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

        const pair = getPairObj<IPairedEffectFnWithReactiveVariable>(effectFn, reactiveVariable);
        if (pair.__circularMark) {
            pair.__circularCalls ??= 0;
            pair.__circularCalls++;
            pair.__circularMark = false;
        }
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

let execBatchedReactionsInProgress = false;
export function dataChanged(reactiveVariable: IReactiveVariable) {
    // Computed functions watchers
    computedFunctionsWatchersCheck(reactiveVariable);

    if (reactiveSubscribe.syncMode || reactiveVariable.syncReactions) {
        executeSyncSingleReactiveVariable(reactiveVariable);
    } else {
        pushReaction(reactiveVariable);

        // Do not used clearTimeout because of performance reason (it calls external WebAPI)
        if (!execBatchedReactionsInProgress) {
            execBatchedReactionsInProgress = true;

            setTimeout(() => {
                execBatchedReactionsInProgress = false;
                executeReactiveVariables();
            });
        }
    }
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
        };

        data.firstExec = false;
    }

    return data;
}
