import * as React from "react";
import * as ReactDOM from "react-dom";

type Finalize = () => void;

/**
 * Works like `useCallback` but returns a callback which debounces
 * invocation by a specified amount of time.
 *
 * ```
 * let [cb, flush, cancel] = useDebouncedCallback(ms, f, [...])
 * ```
 *
 * The `flush` allows to flush execution of the recently scheduled
 * invocation. This is useful in case you need force debounced execution.
 *
 * The `cancel()` cancels the most recently scheduled invocation.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  ms: number,
  f: (...args: Args) => void | Promise<void>,
  deps: unknown[] = [],
): readonly [
  callback: (...args: Args) => void | Promise<void>,
  flush: Finalize,
  cancel: Finalize,
] {
  // Store current ms value in ref.
  //
  // Since we only care about this value changed when we schedule the next
  // invocation we don't use state and only sync a commited `ms` value in
  // useEffect.
  let msref = React.useRef<number>(ms);
  React.useEffect(() => {
    msref.current = ms;
  }, [ms]);

  // Keep track of the currently scheduled invocation.
  type State = {
    timer: NodeJS.Timeout;
    invocation: { f: Function; args: unknown[] };
  };
  let state = React.useRef<State | null>(null);

  // Finalize currently scheduled invocation.
  let finalize = React.useCallback((invoke: boolean = true) => {
    if (state.current != null) {
      let {
        timer,
        invocation: { f, args },
      } = state.current;
      clearTimeout(timer);
      if (invoke) {
        ReactDOM.unstable_batchedUpdates(() => {
          f(...args);
        });
      }
      state.current = null;
    }
  }, []);

  let flush = React.useCallback(() => finalize(true), [finalize]);
  let cancel = React.useCallback(() => finalize(false), [finalize]);

  // If deps change or component is being unmounted we flush currently
  // scheduled invocation, that makes sure the most recent invocation is not
  // lost.
  React.useEffect(() => flush, deps); // eslint-disable-line react-hooks/exhaustive-deps

  let cbd = React.useCallback((...args: Array<unknown>) => {
    // Cancel currently scheduled invocation if any.
    if (state.current != null) {
      clearTimeout(state.current.timer);
      state.current = null;
    }
    // Schedule new invocation.
    state.current = {
      invocation: { f, args },
      timer: setTimeout(flush, msref.current),
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return [cbd, flush, cancel] as const;
}

export type Codec<V> = {
  encode: (v: V) => string;
  decode: (s: string) => V;
};

export let NO_VALUE = {};

export let jsonCodec: Codec<any> = {
  encode(v) {
    return JSON.stringify({ v: v });
  },
  decode(s) {
    let v;
    try {
      v = JSON.parse(s);
    } catch (_err) {
      return NO_VALUE;
    }

    if (v == null || !("v" in v)) return NO_VALUE;
    return v.v;
  },
};

/**
 * Works like React.useState but persists state in a localStorage.
 *
 * Note that the state value stored in a state should be JSON-serializable.
 */
export function usePersistentState<V>(
  id: string,
  init: () => V,
  codec: Codec<V> = jsonCodec,
) {
  let [v, setv] = React.useState<V>(() => {
    let s: string | null = localStorage.getItem(id);
    if (s == null) return init();
    let v = codec.decode(s);
    if (v !== NO_VALUE) return v;
    else return init();
  });

  // Persist committed state to localStorage
  React.useEffect(() => {
    localStorage.setItem(id, codec.encode(v));
  }, [v, id]);

  return [v, setv] as const;
}
