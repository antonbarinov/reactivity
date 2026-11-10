import { describe, expect, it } from 'vitest';
import { reactive } from '../src';
import {reactionsExecuted} from "../src/internal";

class State {
    selectedTable = 'users';

    get replicationRules() {
        return { tables: [this.selectedTable] };
    }

    get tablesOptions() {
        return this.replicationRules.tables.map((table) => ({
            value: table,
            label: table,
        }));
    }
}

describe('nested computed cache', () => {
    it('updates the outer computed when the cached inner computed becomes stale', () => {
        const state = reactive(new State());

        // Cache the inner computed before evaluating the outer one.
        expect(state.replicationRules.tables).toEqual(['users']);
        expect(state.tablesOptions).toEqual([{ value: 'users', label: 'users' }]);

        state.selectedTable = 'orders';

        // Do not read replicationRules here: that would hide the bug.
        expect(state.tablesOptions).toEqual([{ value: 'orders', label: 'orders' }]);
    });

    it('updates the outer computed if the inner computed is read first', () => {
        const state = reactive(new State());
        expect(state.replicationRules.tables).toEqual(['users']);
        expect(state.tablesOptions).toEqual([{ value: 'users', label: 'users' }]);

        state.selectedTable = 'orders';

        expect(state.replicationRules.tables).toEqual(['orders']);
        expect(state.tablesOptions).toEqual([{ value: 'orders', label: 'orders' }]);
    });
});
