import * as Collab from "@codemirror/collab";
import * as Commands from "@codemirror/commands";
import * as Highlight from "@codemirror/highlight";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as Vim from "@replit/codemirror-vim";
import * as React from "react";

import type { DocumentConnection } from "./DocumentConnection";
import { bqn } from "./LangBQN";
import { useDebouncedCallback } from "./ReactUtil";
import * as UI from "./UI";
import BQN, { fmt } from "./bqn";

function evalBQNFromText(text: State.Text) {
  let bqn = text.sliceString(0);
  try {
    return fmt(BQN(bqn));
  } catch {
    return "oops";
  }
}

export type SurfaceProps = {
  conn: DocumentConnection;
};

export function Surface({ conn }: SurfaceProps) {
  let { doc, version } = conn.initialDocument().getOrSuspend();
  let [output, setOutput] = React.useState<null | string>(() =>
    evalBQNFromText(doc),
  );
  let [onDoc] = useDebouncedCallback(
    400,
    (doc: State.Text) => setOutput(evalBQNFromText(doc)),
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

function Output({ output }: { output: string }) {
  let styles = UI.useStyles({
    root: {
      fontFamily: `BQN386, "BQN386 Unicode", Menlo, Monaco, monospace`,
      fontSize: "18px",
    },
  });
  return <pre className={styles.root}>{output}</pre>;
}

export type EditorProps = {
  doc: State.Text;
  onDoc: (doc: State.Text) => void;
  keybindings?: View.KeyBinding[];
  extensions?: State.Extension[];
};

export function Editor({ doc, onDoc, keybindings, extensions }: EditorProps) {
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
    let startState = State.EditorState.create({
      doc,
      extensions: [
        Vim.vim(),
        View.keymap.of(Commands.defaultKeymap),
        onDocExt,
        keybindingsExt,
        bqn(),
        //Highlight.defaultHighlightStyle,
        ...(extensions ?? []),
      ],
    });
    view.current = new View.EditorView({
      state: startState,
      parent: ref.current,
    });

    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, [onDocExt, keybindingsExt, extensions]);
  let styles = UI.useStyles({
    root: {
      position: "relative",
      width: "100%",
      display: "flex",
      "& .cm-content": {
        fontFamily: `BQN386, "BQN386 Unicode", Menlo, Monaco, monospace`,
        fontSize: "18px",
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
