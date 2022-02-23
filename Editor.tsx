import * as Collab from "@codemirror/collab";
import * as Commands from "@codemirror/commands";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as Vim from "@replit/codemirror-vim";
import * as React from "react";

import type { DocumentConnection } from "./DocumentConnection";
import { bqn } from "./LangBQN";
import { useDebouncedCallback } from "./ReactUtil";
import * as UI from "./UI";
import BQN, { fmt } from "./bqn";

type BQNResult = { type: "ok"; ok: string } | { type: "error"; error: string };

function evalBQN(text: State.Text): BQNResult {
  let bqn = text.sliceString(0);
  try {
    return { type: "ok", ok: fmt(BQN(bqn)) };
  } catch (e) {
    let s = Array.from(bqn);
    let w = e.message;
    let is;
    while (
      w &&
      (w.loc || (e.kind !== "!" && w.sh && w.sh[0] === 2)) &&
      w.src.join("") === s.join("")
    )
      [is, w] = w;
    return { type: "error", error: w.join("") };
  }
}

export type SurfaceProps = {
  conn: DocumentConnection;
};

export function Surface({ conn }: SurfaceProps) {
  let { doc, version } = conn.initialDocument().getOrSuspend();
  let [output, setOutput] = React.useState<BQNResult>(() => evalBQN(doc));
  let [onDoc] = useDebouncedCallback(
    400,
    (doc: State.Text) => setOutput(evalBQN(doc)),
    [setOutput],
  );
  let extensions = React.useMemo(
    () => [peerExtension(conn, version)],
    [conn, version],
  );
  let styles = UI.useStyles({
    root: {
      display: "flex",
      flexDirection: "column",
    },
  });
  return (
    <div className={styles.root}>
      <Editor doc={doc} onDoc={onDoc} extensions={extensions} />
      <Output output={output} />
    </div>
  );
}

function Output({ output }: { output: BQNResult }) {
  let styles = UI.useStyles({
    root: {
      fontFamily: `"Iosevka Term Web", Menlo, Monaco, monospace`,
      fontSize: "20px",
      overflowY: "hidden",
      overflowX: "hidden",
      marginTop: "0px",
      marginBottom: "0px",
      marginLeft: "0px",
      marginRight: "0px",
      paddingLeft: "35px",
      textOverflow: "ellipsis",
    },
    hasError: {
      color: "red",
    },
  });
  let children = output.type === "ok" ? output.ok : `ERROR: ${output.error}`;
  return (
    <pre
      className={UI.cx(
        styles.root,
        output.type === "error" && styles.hasError,
      )}
    >
      {children}
    </pre>
  );
}

export type EditorProps = {
  doc: State.Text;
  onDoc: (doc: State.Text) => void;
  keybindings?: View.KeyBinding[];
  extensions?: State.Extension[];
  keymap?: "default" | "vim";
};

export function Editor({
  doc,
  onDoc,
  keymap = "default",
  keybindings,
  extensions,
}: EditorProps) {
  let ref = React.useRef<null | HTMLDivElement>(null);
  let view = React.useRef<null | View.EditorView>(null);

  let onDocExt = useStateCompartment(
    () =>
      View.EditorView.updateListener.of((update) => {
        if (update.docChanged) onDoc(update.state.doc);
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
      bqn(),
      ...(extensions ?? []),
    ];
    let startState = State.EditorState.create({
      doc,
      extensions: extensions0.filter(Boolean),
    });
    view.current = new View.EditorView({
      state: startState,
      parent: ref.current,
    });

    return () => {
      view.current?.destroy();
      view.current = null;
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
      },
      "& .cm-editor": { width: "100%" },
      "& .cm-editor.cm-focused": {},
      "& .cm-editor .cm-activeLine": {},
      "& .cm-editor.cm-focused .cm-activeLine": {},
      "& .cm-line": {},
    },
  });
  return <div className={styles.root} ref={ref} />;
}

function peerExtension(conn: DocumentConnection, startVersion: number) {
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
  return [Collab.collab({ startVersion }), plugin];
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
