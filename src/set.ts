// Prototypes links Set
import {  } from './index';
import { subscribe, IReactiveVariable, dataChanged } from './internatl';

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
}

export function setObservableMapSet(target, type = 'set') {
    let size = target.size;

    const reactiveVariable: IReactiveVariable = {
        value: false,
        prevValue: false,
        subscribers: new Set(),
        mapSetVars: new Map(),
    };

    Object.defineProperty(target, 'size', {
        get() {
            subscribe(reactiveVariable);
            return size;
        },
        enumerable: false,
        configurable: true,
    });

    // Only SET specified
    target.add = function (value) {
        const valueExist = mapSetPrototypes[`${type}__has`].apply(this, arguments);
        const rv = registerMapSetReactiveVar(reactiveVariable, value);
        rv.value = true;

        // Data changed
        if (!valueExist) {
            mapSetPrototypes[`${type}__add`].apply(this, arguments);
            size++;

            dataChanged(reactiveVariable);
            dataChanged(rv);
        }
    };

    // Only MAP specified
    target.set = function (key, value) {
        let valueExist = mapSetPrototypes[`${type}__has`].apply(this, [key]);
        const rv = registerMapSetReactiveVar(reactiveVariable, key);
        rv.value = true;

        mapSetPrototypes[`${type}__set`].apply(this, arguments);

        // Data changed
        if (!valueExist) {
            size++;

            dataChanged(reactiveVariable);
            dataChanged(rv);
        }
    };

    // Only MAP specified
    target.get = function (key) {
        const rv = registerMapSetReactiveVar(reactiveVariable, key);
        subscribe(rv);

        return mapSetPrototypes[`${type}__get`].apply(this, arguments);
    };

    target.clear = function() {
        const prevKeysLen = target.size;
        mapSetPrototypes[`${type}__clear`].apply(this, arguments);
        // Data changed
        if (prevKeysLen > 0) {
            size = 0;
            reactiveVariable.value = !reactiveVariable.value;

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
            size--;
            reactiveVariable.value = !reactiveVariable.value;

            dataChanged(reactiveVariable);

            const rv = registerMapSetReactiveVar(reactiveVariable, value);
            rv.value = false;
            dataChanged(rv);
        }
    };

    target.has = function (key) {
        const rv = registerMapSetReactiveVar(reactiveVariable, key);
        subscribe(rv);

        const has = mapSetPrototypes[`${type}__has`].apply(this, arguments);

        return has;
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


function registerMapSetReactiveVar(reactiveVariable: IReactiveVariable, key: string | object) {
    let registered = reactiveVariable.mapSetVars.get(key);
    if (!registered) {
        registered = {
            value: false,
            prevValue: false,
            subscribers: new Set(),
        }
        reactiveVariable.mapSetVars.set(key, registered);
    }

    return registered;
}

