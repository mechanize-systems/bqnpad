import * as View from "@codemirror/view";

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
