/// <reference types="react-dom/next" />

/**
 * React bindings to codemirror 6.
 */
import * as Commands from "@codemirror/commands";
import * as Highlight from "@codemirror/highlight";
import * as History from "@codemirror/history";
import type * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";

import * as Base from "@mechanize/base";

export type EditorProps = {
  doc: State.Text;
  onDoc?: (doc: State.Text, state: State.EditorState) => void;
  keybindings?: View.KeyBinding[];
  extensions?: (undefined | State.Extension)[];
  placeholder?: string | null | undefined;
  api?: React.MutableRefObject<null | View.EditorView>;
  className?: string;
};

export let Editor = React.forwardRef<HTMLElement, EditorProps>(function Editor(
  { doc, onDoc, keybindings, extensions, placeholder, api, className },
  ref0,
) {
  let doc0 = Base.React.useMemoOnce(() => doc);
  let ref = React.useRef<null | HTMLDivElement>(null);
  let view = React.useRef<null | View.EditorView>(null);

  let onDocExt = useStateCompartment(
    view,
    () =>
      View.EditorView.updateListener.of((update) => {
        if (update.docChanged && onDoc != null) {
          onDoc(update.state.doc, update.state);
        }
      }),
    [onDoc],
  );
  let keybindingsExt = useStateCompartment(
    view,
    () => View.keymap.of(keybindings ?? []),
    [keybindings],
  );
  let placeholderExt = useStateCompartment(
    view,
    () => View.placeholder(placeholder ?? ""),
    [placeholder],
  );

  React.useEffect(() => {
    let extensions0 = [
      History.history(),
      View.keymap.of(History.historyKeymap),
      keybindingsExt,
      onDocExt,
      View.keymap.of(Commands.defaultKeymap),
      placeholderExt,
      View.EditorView.lineWrapping,
      ...(extensions ?? []),
    ];
    let startState = State.EditorState.create({
      doc: doc0,
      extensions: extensions0.filter(Boolean) as State.Extension[],
    });
    view.current = new View.EditorView({
      state: startState,
      parent: ref.current as HTMLDivElement,
    });
    if (ref0 != null)
      if (typeof ref0 === "function") ref0(view.current.contentDOM);
      else ref0.current = view.current.contentDOM;
    if (api != null) api.current = view.current;
    return () => {
      view.current?.destroy();
      view.current = null;
      if (api != null) api.current = null;
    };
  }, [doc0, ref0, api, onDocExt, keybindingsExt, placeholderExt, extensions]);
  return <div className={className} ref={ref} />;
});

export function highlight(
  textContent: string,
  language: Language.Language,
  highlight: Highlight.HighlightStyle,
) {
  let chunks: string[] = [];
  let callback = (
    text: string,
    style: null | string,
    _from: number,
    _to: number,
  ): void => {
    chunks.push(`<span class="${style ?? ""}">${text}</span>`);
  };
  const tree = language.parser.parse(textContent);
  let pos = 0;
  Highlight.highlightTree(tree, highlight.match, (from, to, classes) => {
    from > pos && callback(textContent.slice(pos, from), null, pos, from);
    callback(textContent.slice(from, to), classes, from, to);
    pos = to;
  });
  pos != tree.length &&
    callback(textContent.slice(pos, tree.length), null, pos, tree.length);
  return chunks.join("");
}

/**
 * Produce a dynamically configured `State.Extension`.
 *
 * The extension is reconfigured whenever values mentioned in `deps` array
 * change.
 */
export function useStateCompartment(
  view: View.EditorView | React.RefObject<View.EditorView | null>,
  configure: () => State.Extension,
  deps: unknown[],
): State.Extension {
  let { compartment, extension } = React.useMemo(() => {
    let compartment = new State.Compartment();
    let extension = compartment.of(configure());
    return { compartment, extension };
  }, []); // eslint-disable-line
  React.useEffect(() => {
    let v = view instanceof View.EditorView ? view : view.current;
    if (v == null) return;
    v.dispatch({ effects: [compartment.reconfigure(configure())] });
  }, [view, ...deps]); // eslint-disable-line
  return extension;
}

export function useStateField<T>(
  view: View.EditorView | React.RefObject<View.EditorView | null>,
  value: T,
  deps: unknown[] = [value],
) {
  let value0 = Base.React.useMemoOnce(() => value);
  let [field, effect] = React.useMemo(() => {
    let effect = State.StateEffect.define<T>();
    let field = State.StateField.define<T>({
      create() {
        return value0;
      },
      update(state, tr) {
        for (let e of tr.effects) if (e.is(effect)) return e.value;
        return state;
      },
    });
    return [field, effect] as const;
  }, [value0]);
  React.useEffect(() => {
    let v = view instanceof View.EditorView ? view : view.current;
    v?.dispatch({ effects: [effect.of(value)] });
  }, [view, effect, ...deps]); // eslint-disable-line
  return field;
}

export abstract class ReactWidget extends View.WidgetType {
  abstract render(): React.ReactChild;

  protected _container: null | {
    dom: HTMLDivElement;
    root: ReactDOMClient.Root;
  } = null;

  get container() {
    if (this._container == null) {
      let dom = document.createElement("div");
      dom.setAttribute("aria-hidden", "true");
      let root = ReactDOMClient.createRoot(dom);
      this._container = { dom, root };
    }
    return this._container;
  }

  toDOM() {
    ReactDOM.flushSync(() => {
      this.container.root.render(this.render());
    });
    return this.container.dom;
  }

  override updateDOM(dom: HTMLElement) {
    if (dom !== this.container.dom) return false;
    ReactDOM.flushSync(() => {
      this.container.root.render(this.render());
    });
    return true;
  }

  override destroy() {
    this.container.root.unmount();
    this._container = null;
  }
}
