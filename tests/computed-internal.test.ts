import {
    autorun, reaction, reactive, when, markSynchronousReactions, createReaction, computedSubscribe,
    reactiveSubscribe
} from '../src';
import {getReactiveVariable, reactionsExecuted} from '../src/internal';
import { sleep } from '../src_tests/helpers';
import { assert, describe, expect, it } from 'vitest'
import test from "node:test";


describe('computed internal', () => {
    it('nested computed evaluation does not expose outer dependencies to the effect', () => {
        class State {
            first = 1;
            second = 2;
            get inner() { return this.first; }
            get outer() { return this.inner + this.second; }
        }
        const state = reactive(new State());
        const effect = () => {};
        const reaction = createReaction(effect);
        reaction.track(() => { assert.equal(state.outer, 3); });

        assert.equal(getReactiveVariable(state, 'first').subscribers.has(effect as any), false);
        assert.equal(getReactiveVariable(state, 'second').subscribers.has(effect as any), false);
        reaction.dispose();
    });

    it('a throwing computed restores tracking and the computed dependency stack', () => {
        class State {
            value = 1;
            get broken() { throw new Error('broken'); }
        }
        const state = reactive(new State());
        assert.throws(() => state.broken, /broken/);
        assert.equal(computedSubscribe.dependencies.length, 0);

        const effect = () => {};
        const reaction = createReaction(effect);
        reaction.track(() => state.value);
        assert.equal(getReactiveVariable(state, 'value').subscribers.has(effect as any), true);
        assert.equal(reactiveSubscribe.currentEffect, undefined);
        reaction.dispose();
    });

    it('stopping an effect does not cancel an enclosing tracking pause', () => {
        const effect = () => {};
        reactiveSubscribe.pauseTracking();
        try {
            reactiveSubscribe.start(effect);
            reactiveSubscribe.stop();
            reactiveSubscribe.start(effect);
            assert.equal(reactiveSubscribe.currentEffect, null);
            reactiveSubscribe.stop();
        } finally {
            reactiveSubscribe.resumeTracking();
        }
    });

})
