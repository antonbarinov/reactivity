import { subscribe, IReactiveVariable, dataChanged } from './internal';

// Prototypes links for Set and Map
const mapSetPrototypes = {
    'set__add': Set.prototype.add,
    'set__clear': Set.prototype.clear,
    'set__forEach': Set.prototype.forEach,
    'set__delete': Set.prototype.delete,
    'set__values': Set.prototype.values,
    'set__entries': Set.prototype.entries,
    'set__keys': Set.prototype.keys,
    'set__has': Set.prototype.has,

    'map__set': Map.prototype.set,
    'map__get': Map.prototype.get,
    'map__clear': Map.prototype.clear,
    'map__forEach': Map.prototype.forEach,
    'map__delete': Map.prototype.delete,
    'map__values': Map.prototype.values,
    'map__entries': Map.prototype.entries,
    'map__keys': Map.prototype.keys,
    'map__has': Map.prototype.has,

    'weak_map__set': WeakMap.prototype.set,
    'weak_map__get': WeakMap.prototype.get,
    'weak_map__delete': WeakMap.prototype.delete,
    'weak_map__has': WeakMap.prototype.has,

    'weak_set__add': WeakSet.prototype.add,
    'weak_set__delete': WeakSet.prototype.delete,
    'weak_set__has': WeakSet.prototype.has,
}

export function setObservableMapSet(target, type: 'set' | 'map' | 'weak_map' | 'weak_set') {
    const reactiveVariable: IReactiveVariable = {
        value: false,
        prevValue: false,
        subscribers: new Set(),
        mapSetVars: new Map(),
    };

    const reactiveVariablesSize: IReactiveVariable = {
        value: target.size,
        prevValue: target.size,
        subscribers: new Set(),
    };

    // Fill initial values
    if (type == 'set' || type === 'map') {
        mapSetPrototypes[`${type}__forEach`].call(target, (v, k) => {
            const rv = registerMapSetReactiveVar(reactiveVariable, k, type);
            if (type === 'set') {
                rv.value = true;
            } else {
                rv.value = v;
            }
        });
    }

    target.__reactiveVariable = reactiveVariable;

    Object.defineProperty(target, 'size', {
        get() {
            subscribe(reactiveVariablesSize);
            return reactiveVariablesSize.value;
        },
        enumerable: false,
        configurable: true,
    });

    // Only SET specified
    target.add = function (value) {
        const valueExist = mapSetPrototypes[`${type}__has`].apply(this, arguments);
        const rv = registerMapSetReactiveVar(reactiveVariable, value, type);
        rv.value = true;

        // Data changed
        if (!valueExist) {
            mapSetPrototypes[`${type}__add`].apply(this, arguments);

            reactiveVariablesSize.value++;
            dataChanged(reactiveVariablesSize);

            dataChanged(reactiveVariable);
            dataChanged(rv);
        }
    };

    // Only MAP specified
    target.set = function (key, value) {
        const valueExist = mapSetPrototypes[`${type}__has`].apply(this, [key]);
        const rv = registerMapSetReactiveVar(reactiveVariable, key, type);
        rv.value = value;

        const prevValue = mapSetPrototypes[`${type}__get`].apply(this, [key]);

        mapSetPrototypes[`${type}__set`].apply(this, arguments);

        const changed = !valueExist || (prevValue !== value);

        if (!valueExist) {
            reactiveVariablesSize.value++;
            dataChanged(reactiveVariablesSize);
        }

        // Data changed
        if (changed) {
            dataChanged(reactiveVariable);
            dataChanged(rv);
        }
    };

    // Only MAP specified
    target.get = function (key) {
        const rv = registerMapSetReactiveVar(reactiveVariable, key, type);
        subscribe(rv);

        return mapSetPrototypes[`${type}__get`].apply(this, arguments);
    };

    target.clear = function() {
        const prevKeysLen = target.size;
        mapSetPrototypes[`${type}__clear`].apply(this, arguments);
        // Data changed
        if (prevKeysLen > 0) {
            reactiveVariablesSize.value = 0;
            dataChanged(reactiveVariablesSize);

            dataChanged(reactiveVariable);

            reactiveVariable.mapSetVars.forEach((rv, key) => {
                rv.value = false;
                dataChanged(rv);
            });
        }
    };

    target.delete = function (value) {
        const valueExist = mapSetPrototypes[`${type}__has`].apply(this, arguments);
        // Data changed
        if (valueExist) {
            mapSetPrototypes[`${type}__delete`].apply(this, arguments);

            reactiveVariablesSize.value--;
            dataChanged(reactiveVariablesSize);

            dataChanged(reactiveVariable);

            //const rv = registerMapSetReactiveVar(reactiveVariable, value, type);
            //rv.value = false;
            //dataChanged(rv);
        }
    };

    target.has = function (key) {
        const rv = registerMapSetReactiveVar(reactiveVariable, key, type);
        subscribe(rv);

        return mapSetPrototypes[`${type}__has`].apply(this, arguments);
    };

    target.entries = function () {
        subscribe(reactiveVariable);
        return mapSetPrototypes[`${type}__entries`].apply(this, arguments);
    };

    target.values = function () {
        subscribe(reactiveVariable);
        return mapSetPrototypes[`${type}__values`].apply(this, arguments);
    };

    target.keys = function () {
        subscribe(reactiveVariable);
        return mapSetPrototypes[`${type}__keys`].apply(this, arguments);
    };

    target.forEach = function () {
        subscribe(reactiveVariable);
        return mapSetPrototypes[`${type}__forEach`].apply(this, arguments);
    };
}


function registerMapSetReactiveVar(reactiveVariable: IReactiveVariable, key: string | object, type: 'set' | 'map' | 'weak_map' | 'weak_set') {
    let registered = reactiveVariable.mapSetVars.get(key);
    if (!registered) {
        let initVal = undefined;
        if (type === 'set' || type === 'weak_set') initVal = false;

        registered = {
            value: initVal,
            prevValue: initVal,
            subscribers: new Set(),
        }
        reactiveVariable.mapSetVars.set(key, registered);
    }

    return registered;
}

const arrayFrom = Array.from;

Array.from = function(arr) {
    if (arr.__reactiveVariable) {
        subscribe(arr.__reactiveVariable);
    }
    return arrayFrom(arr);
}
