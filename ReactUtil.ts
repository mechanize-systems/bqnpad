import * as React from "react";
import * as ReactDOM from "react-dom";

type Callback = (...args: Array<any>) => void | Promise<void>;
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
export function useDebouncedCallback<T extends Callback>(
  ms: number,
  f: T,
  deps: unknown[] = [],
): readonly [callback: T, flush: Finalize, cancel: Finalize] {
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
  }, deps) as T; // eslint-disable-line react-hooks/exhaustive-deps

  return [cbd, flush, cancel] as const;
}
