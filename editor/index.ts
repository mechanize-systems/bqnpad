import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

export { useEditor, useStateCompartment, useStateField } from "./useEditor";
export { highlight } from "./highlight";
export * as Cells from "./Cells";
export { scrollMarginBottom } from "./scrollMarginBottom";

export function viewRef() {
  let view: { current: View.EditorView | null } = { current: null };
  let extension = View.ViewPlugin.fromClass(
    class {
      constructor(view0: View.EditorView) {
        view.current = view0;
      }
      destroy() {
        view.current = null;
      }
    },
  );
  return [view, extension] as const;
}

export function useStateValue<T>(
  initValue: T,
  f: (state: State.EditorState) => T,
  deps: unknown[] = [],
) {
  let [v, setv] = React.useState<T>(initValue);
  let ext = React.useMemo(() => {
    return View.EditorView.updateListener.of((update) =>
      setv(f(update.state)),
    );
  }, [setv, ...deps]); // eslint-disable-line
  return [v, ext] as const;
}
