import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

export {
  useEditor,
  useStateCompartment,
  useEditor2React,
  useReact2Editor,
} from "./useEditor";
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
