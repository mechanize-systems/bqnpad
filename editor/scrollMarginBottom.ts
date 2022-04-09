import * as View from "@codemirror/view";

export let scrollMarginBottom = (marginBottom: number) =>
  View.ViewPlugin.fromClass(
    class {
      update(up: View.ViewUpdate) {
        let view = up.view;
        if (!up.selectionSet) return;
        let sel = up.state.selection.main;
        view.requestMeasure<{ cursor: View.Rect | null; scroller: DOMRect }>({
          read() {
            return {
              scroller: view.scrollDOM.getBoundingClientRect(),
              cursor: view.coordsAtPos(sel.anchor),
            };
          },
          write({ cursor, scroller }) {
            if (cursor == null) return;
            let diff = scroller.bottom - cursor.bottom;
            if (diff < marginBottom)
              view.scrollDOM.scrollTop += marginBottom - diff;
          },
        });
      }
    },
  );
