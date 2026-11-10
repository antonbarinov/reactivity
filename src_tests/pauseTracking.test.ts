import { describe, expect, it, vi } from 'vitest';
import { autorun, computedSubscribe, reactive, reactiveSubscribe } from '../src';
import { reactionsExecuted } from '../src/internal';

describe('pauseTracking', () => {
    it('ignores reads during a pause and tracks reads after resuming', async () => {
        const state = reactive({ before: 0, ignored: 0, after: 0 });
        const effect = vi.fn(() => {
            state.before;
            reactiveSubscribe.pauseTracking();
            try {
                state.ignored;
            } finally {
                reactiveSubscribe.resumeTracking();
            }
            state.after;
        });
        const dispose = autorun(effect);
        try {
            state.ignored++;
            await reactionsExecuted();
            expect(effect).toHaveBeenCalledTimes(1);

            state.before++;
            await reactionsExecuted();
            expect(effect).toHaveBeenCalledTimes(2);

            state.after++;
            await reactionsExecuted();
            expect(effect).toHaveBeenCalledTimes(3);
        } finally {
            dispose();
        }
    });

    it('keeps tracking paused until all nested pauses are resumed', async () => {
        const state = reactive({ ignored: 0, tracked: 0 });
        const effect = vi.fn(() => {
            reactiveSubscribe.pauseTracking();
            reactiveSubscribe.pauseTracking();
            try {
                reactiveSubscribe.resumeTracking();
                state.ignored;
            } finally {
                reactiveSubscribe.resumeTracking();
            }
            state.tracked;
        });
        const dispose = autorun(effect);
        try {
            state.ignored++;
            await reactionsExecuted();
            expect(effect).toHaveBeenCalledTimes(1);
            state.tracked++;
            await reactionsExecuted();
            expect(effect).toHaveBeenCalledTimes(2);
        } finally {
            dispose();
        }
    });

    it('does not subscribe an effect to a computed read while paused', async () => {
        class State {
            source = 1;
            trigger = 0;
            constructor() { reactive(this); }
            get double() { return this.source * 2; }
        }
        const state = new State();
        const values: number[] = [];
        const dispose = autorun(() => {
            state.trigger;
            reactiveSubscribe.pauseTracking();
            try {
                values.push(state.double);
            } finally {
                reactiveSubscribe.resumeTracking();
            }
        });
        try {
            state.source = 2;
            await reactionsExecuted();
            expect(values).toEqual([2]);
            state.trigger++;
            await reactionsExecuted();
            expect(values).toEqual([2, 4]);
        } finally {
            dispose();
        }
    });

    it('pauses computed dependencies without affecting reads after resume', () => {
        let calls = 0;
        class State {
            before = 1;
            ignored = 1;
            after = 1;
            constructor() { reactive(this); }
            get total() {
                calls++;
                const before = this.before;
                computedSubscribe.pauseTracking();
                let ignored: number;
                try {
                    ignored = this.ignored;
                } finally {
                    computedSubscribe.resumeTracking();
                }
                return before + ignored + this.after;
            }
        }
        const state = new State();
        expect(state.total).toBe(3);
        state.ignored = 2;
        expect(state.total).toBe(3);
        expect(calls).toBe(1);
        state.before = 2;
        expect(state.total).toBe(5);
        state.after = 2;
        expect(state.total).toBe(6);
        expect(calls).toBe(3);
    });
});
