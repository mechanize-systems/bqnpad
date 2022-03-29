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

export type EditorProps = EditorConfig & {
  className?: string;
  editorRef?: React.MutableRefObject<null | View.EditorView>;
};

export function Editor({ className, editorRef, ...config }: EditorProps) {
  let ref = React.useRef<HTMLDivElement | null>(null);
  useEditor(ref, {
    ...config,
    onEditorView(view) {
      if (editorRef != null) editorRef.current = view;
    },
  });
  return <div className={className} ref={ref} />;
}

export type EditorConfig = {
  doc: State.Text;
  onDoc?: (doc: State.Text, state: State.EditorState) => void;
  keybindings?: View.KeyBinding[];
  extensions?: (undefined | State.Extension)[];
  placeholder?: string | null | undefined;
  onEditorView?: (view: View.EditorView) => void;
};

export function useEditor<E extends HTMLElement>(
  ref: React.MutableRefObject<E | null>,
  config: EditorConfig,
) {
  let { doc, onDoc, keybindings, extensions, placeholder, onEditorView } =
    config;
  let doc0 = Base.React.useMemoOnce(() => doc);
  let onEditorView0 = Base.React.useMemoOnce(() => onEditorView);
  let view = React.useRef<null | View.EditorView>(null);

  let onDocExtension = useStateCompartment(
    view,
    () =>
      View.EditorView.updateListener.of((update) => {
        if (update.docChanged && onDoc != null) {
          onDoc(update.state.doc, update.state);
        }
      }),
    [onDoc],
  );
  let keybindingsExtension = useStateCompartment(
    view,
    () => View.keymap.of(keybindings ?? []),
    [keybindings],
  );
  let placeholderExtension = useStateCompartment(
    view,
    () => View.placeholder(placeholder ?? ""),
    [placeholder],
  );

  React.useLayoutEffect(() => {
    let extensions0 = [
      History.history(),
      View.keymap.of(History.historyKeymap),
      keybindingsExtension,
      onDocExtension,
      View.keymap.of(Commands.defaultKeymap),
      placeholderExtension,
      ...(extensions ?? []),
    ];
    let startState = State.EditorState.create({
      doc: doc0,
      extensions: extensions0.filter(Boolean) as State.Extension[],
    });
    view.current = new View.EditorView({
      state: startState,
      parent: ref.current!,
    });
    onEditorView0?.(view.current);
    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, [
    ref,
    doc0,
    onDocExtension,
    keybindingsExtension,
    placeholderExtension,
    extensions,
    onEditorView0,
  ]);
  return view;
}

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

type StateFieldConfig<T> = {
  view: View.EditorView | React.RefObject<View.EditorView | null>;
  value: T | (() => T);
  provide?: (field: State.StateField<T>) => State.Extension;
};

export function useStateField<T>(
  { view, value, provide }: StateFieldConfig<T>,
  deps: unknown[] = [value],
) {
  let value0 = Base.React.useMemoOnce<T>(
    typeof value === "function" ? (value as () => T) : () => value,
  );
  let provide0 = Base.React.useMemoOnce(() => provide);
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
      provide: provide0,
    });
    return [field, effect] as const;
  }, [value0, provide0]);
  React.useEffect(() => {
    let v = view instanceof View.EditorView ? view : view.current;
    let newValue = typeof value === "function" ? (value as () => T)() : value;
    v?.dispatch({
      effects: [effect.of(newValue)],
    });
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
