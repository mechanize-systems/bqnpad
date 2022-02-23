import * as Collab from "@codemirror/collab";
import * as Commands from "@codemirror/commands";
import * as Highlight from "@codemirror/highlight";
import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as Vim from "@replit/codemirror-vim";
import * as React from "react";

import * as LangBQN from "./LangBQN";
import * as UI from "./UI";
import type { WorkspaceConnection } from "./WorkspaceConnection";

export type EditorProps = {
  doc: State.Text;
  onDoc?: (doc: State.Text, state: State.EditorState) => void;
  keybindings?: View.KeyBinding[];
  extensions?: State.Extension[];
  keymap?: "default" | "vim";
  api?: React.MutableRefObject<null | View.EditorView>;
};

export function Editor({
  doc,
  onDoc,
  keymap = "default",
  keybindings,
  extensions,
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

  React.useEffect(() => {
    let extensions0 = [
      keymap === "vim" && Vim.vim(),
      View.keymap.of(Commands.defaultKeymap),
      onDocExt,
      keybindingsExt,
      LangBQN.bqn(),
      ...(extensions ?? []),
    ];
    let startState = State.EditorState.create({
      doc,
      extensions: extensions0.filter(Boolean),
    });
    view.current = api.current = new View.EditorView({
      state: startState,
      parent: ref.current,
    });
    return () => {
      view.current?.destroy();
      view.current = api.current = null;
    };
  }, [keymap, onDocExt, keybindingsExt, extensions]);
  let styles = UI.useStyles({
    root: {
      position: "relative",
      width: "100%",
      display: "flex",
      "& .cm-content": {
        fontFamily: `"Iosevka Term Web", Menlo, Monaco, monospace`,
        fontSize: "20px",
        padding: 0,
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

export function peerExtension(
  conn: WorkspaceConnection,
  startVersion: number,
) {
  let plugin = View.ViewPlugin.fromClass(
    class {
      private pushing = false;
      private done = false;

      constructor(private view: View.EditorView) {
        this.pull();
      }

      update(update: View.ViewUpdate) {
        if (update.docChanged) this.push();
      }

      async push() {
        let updates = Collab.sendableUpdates(this.view.state);
        if (this.pushing || !updates.length) return;
        this.pushing = true;
        let version = Collab.getSyncedVersion(this.view.state);
        await conn.pushUpdates(version, updates);
        this.pushing = false;
        // Regardless of whether the push failed or new updates came in
        // while it was running, try again if there's updates remaining
        if (Collab.sendableUpdates(this.view.state).length)
          setTimeout(() => this.push(), 100);
      }

      async pull() {
        while (!this.done) {
          let version = Collab.getSyncedVersion(this.view.state);
          let updates = await conn.pullUpdates(version);
          this.view.dispatch(Collab.receiveUpdates(this.view.state, updates));
        }
      }

      destroy() {
        this.done = true;
      }
    },
  );
  return [Collab.collab({ startVersion, clientID: conn.clientID }), plugin];
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

export function highlight(
  textContent: string,
  language: Language.Language,
  highlight: Highlight.HighlightStyle,
) {
  let chunks = [];
  let callback = (
    text: string,
    style: string,
    from: number,
    to: number,
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
