/// <reference types="react-dom/next" />

/**
 * React bindings to codemirror 6.
 */
import * as Commands from "@codemirror/commands";
import * as Highlight from "@codemirror/highlight";
import type * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as Vim from "@replit/codemirror-vim";
import * as React from "react";
import * as ReactDOM from "react-dom";

import * as UI from "./UI";

export type EditorProps = {
  doc: State.Text;
  onDoc?: (doc: State.Text, state: State.EditorState) => void;
  keybindings?: View.KeyBinding[];
  extensions?: (undefined | State.Extension)[];
  keymap?: "default" | "vim";
  placeholder?: string | null | undefined;
  api?: React.MutableRefObject<null | View.EditorView>;
};

export function Editor({
  doc,
  onDoc,
  keymap = "default",
  keybindings,
  extensions,
  placeholder,
  api,
}: EditorProps) {
  let ref = React.useRef<null | HTMLDivElement>(null);
  let view = React.useRef<null | View.EditorView>(null);

  let onDocExt = useStateCompartment(
    () =>
      View.EditorView.updateListener.of((update) => {
        if (update.docChanged && onDoc != null) {
          onDoc(update.state.doc, update.state);
        }
      }),
    [onDoc],
  );
  let keybindingsExt = useStateCompartment(
    () => View.keymap.of(keybindings ?? []),
    [keybindings],
  );
  let placeholderExt = useStateCompartment(
    () => View.placeholder(placeholder ?? ""),
    [placeholder],
  );

  React.useEffect(() => {
    let extensions0 = [
      keybindingsExt,
      keymap === "vim" && Vim.vim(),
      onDocExt,
      View.keymap.of(Commands.defaultKeymap),
      placeholderExt,
      ...(extensions ?? []),
    ];
    let startState = State.EditorState.create({
      doc,
      extensions: extensions0.filter(Boolean) as State.Extension[],
    });
    view.current = new View.EditorView({
      state: startState,
      parent: ref.current as HTMLDivElement,
    });
    if (api != null) api.current = view.current;
    return () => {
      view.current?.destroy();
      view.current = null;
      if (api != null) api.current = null;
    };
  }, [keymap, onDocExt, keybindingsExt, placeholderExt, extensions]);
  let styles = UI.useStyles({
    root: {
      position: "relative",
      width: "100%",
      height: "100%",
      display: "flex",
      "& .cm-content": {
        fontFamily: `"Iosevka Term Web", Menlo, Monaco, monospace`,
        fontSize: "20px",
        padding: "12px",
        paddingBottom: "300px",
      },
      "& .cm-editor": { width: "100%" },
      "& .cm-editor.cm-focused": {},
      "& .cm-editor .cm-activeLine": {},
      "& .cm-editor.cm-focused .cm-activeLine": {},
      "& .cm-line": { padding: 0 },
    },
  });
  return <div className={styles.root} ref={ref} />;
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
function useStateCompartment(
  configure: () => State.Extension,
  deps: unknown[],
): State.Extension {
  let { compartment, extension } = React.useMemo(() => {
    let compartment = new State.Compartment();
    let extension = compartment.of(configure());
    return { compartment, extension };
  }, []); // eslint-disable-line
  React.useEffect(() => {
    compartment.reconfigure(configure());
  }, deps); // eslint-disable-line
  return extension;
}

export abstract class ReactWidget extends View.WidgetType {
  abstract render(): React.ReactChild;

  protected _container: null | {
    dom: HTMLDivElement;
    root: ReactDOM.Root;
  } = null;

  get container() {
    if (this._container == null) {
      let dom = document.createElement("div");
      dom.setAttribute("aria-hidden", "true");
      let root = ReactDOM.createRoot(dom);
      this._container = { dom, root };
    }
    return this._container;
  }

  toDOM() {
    this.container.root.render(this.render());
    return this.container.dom;
  }

  override updateDOM(dom: HTMLElement) {
    if (dom !== this.container.dom) return false;
    this.container.root.render(this.render());
    return true;
  }

  override destroy() {
    this.container.root.unmount();
    this._container = null;
  }
}
