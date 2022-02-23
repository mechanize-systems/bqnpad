import type { Suspendable } from "@bqnpad/lib/PromiseUtil";
import { useDebouncedCallback } from "@bqnpad/lib/ReactUtil";
import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import type * as View from "@codemirror/view";
import * as React from "react";

import { Editor, highlight } from "./Editor";
import type { EditorProps } from "./Editor";
import * as EditorBQN from "./EditorBQN";
import * as UI from "./UI";
import * as BQN from "./bqn";

type BQNResult =
  | { type: "ok"; ok: null | string }
  | { type: "error"; error: string };

type BQNPreview = BQNResult | { type: "notice"; notice: string };

export type Workspace = {
  cells: WorkspaceCell[];
  current: State.Text;
};

export type WorkspaceCell = {
  code: string;
  result?: BQNResult | null;
};

export type WorkspaceManager = {
  load: () => Suspendable<Workspace>;
  store(fn: (workspace: Workspace) => Workspace): void;
};

class REPL {
  private repl: BQN.REPL;
  constructor() {
    this.repl = BQN.makerepl(BQN.sysargs, 1);
  }

  eval(code: State.Text | string): BQNResult {
    let codeString = typeof code === "string" ? code : code.sliceString(0);
    if (codeString.trim().length === 0) return { type: "ok", ok: null };
    try {
      let value = this.repl(codeString);
      return { type: "ok", ok: BQN.fmt(value) };
    } catch (e) {
      return { type: "error", error: BQN.fmtErr(e as any) };
    }
  }

  preview(code: State.Text | string): BQNPreview {
    let codeString = typeof code === "string" ? code : code.sliceString(0);
    if (codeString.trim().length === 0) return { type: "ok", ok: null };
    try {
      BQN.allowSideEffect(false);
      let value = this.repl(codeString);
      BQN.allowSideEffect(true);
      return { type: "ok", ok: BQN.fmt(value) };
    } catch (e) {
      if ((e as any).kind === "sideEffect")
        return {
          type: "notice",
          notice:
            "cannot preview this expression as it produces side effects, submit expression (Shift+Enter) to see its result",
        };
      return { type: "error", error: BQN.fmtErr(e as any) };
    } finally {
      BQN.allowSideEffect(true);
    }
  }
}

function usePreview(repl: REPL) {
  let [preview, setPreview] = React.useState<null | BQNPreview>(null);
  let [updatePreview, _onDocFinalize, onDocCancel] = useDebouncedCallback(
    500,
    (doc: State.Text, state: State.EditorState) => {
      let tree = Language.syntaxTree(state);
      let c = tree.cursor();
      if (c.lastChild() && c.node.type.name === "ASSIGN" && c.firstChild()) {
        let from = c.from;
        if (c.nextSibling()) {
          let to = c.from;
          let ws = State.Text.of([new Array(to - from).fill(" ").join()]);
          doc = doc.replace(from, to, ws);
        }
      }
      setPreview(repl.preview(doc));
    },
    [setPreview, repl],
  );
  let resetPreview = () => {
    onDocCancel();
    setPreview({ type: "ok", ok: null });
  };
  return [preview, updatePreview, resetPreview] as const;
}

export type WorkspaceProps = {
  manager: WorkspaceManager;
};

export function Workspace({ manager }: WorkspaceProps) {
  let workspace0 = manager.load().getOrSuspend();
  let repl = React.useMemo(() => new REPL(), []);
  let [workspace, setWorkspace] = React.useState<Workspace>(() => workspace0);
  let [preview, updatePreview, resetPreview] = usePreview(repl);
  let onDoc: EditorProps["onDoc"] = React.useCallback(
    (doc, state) => {
      updatePreview(doc, state);
      manager.store((workspace) => ({ ...workspace, current: doc }));
    },
    [manager, updatePreview],
  );
  let editor = React.useRef<null | View.EditorView>(null);
  let extensions = React.useMemo(() => [EditorBQN.bqn()], []);
  let styles = UI.useStyles({
    root: {
      display: "flex",
      flexDirection: "column",
    },
    historyItem: {
      paddingBottom: "20px",
    },
  });
  let keybindings: View.KeyBinding[] = React.useMemo(
    () => [
      {
        key: "Shift-Enter",
        run: (view) => {
          let text = view.state.doc;
          let code = text.sliceString(0);
          let cell = { code, result: repl.eval(code) };
          setWorkspace((w) => ({ ...w, cells: w.cells.concat(cell) }));
          manager.store((w) => ({ ...w, cells: w.cells.concat(cell) }));
          resetPreview();
          view.dispatch({ changes: { from: 0, to: code.length, insert: "" } });
          return true;
        },
      },
    ],
    [setWorkspace, repl],
  );
  return (
    <div className={styles.root}>
      {workspace.cells.map((cell, idx) => (
        <Cell key={idx} cell={cell} />
      ))}
      <Editor
        api={editor}
        doc={workspace.current}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
      />
      <Output output={preview ?? repl.preview(workspace.current)} />
    </div>
  );
}

function Cell({ cell }: { cell: WorkspaceCell }) {
  let code = React.useMemo(
    () => highlight(cell.code, EditorBQN.language, EditorBQN.highlight),
    [cell.code],
  );
  let styles = UI.useStyles({
    root: {
      paddingBottom: "20px",
    },
  });
  return (
    <div className={styles.root}>
      <Code code={code} />
      <Output output={cell.result ?? { type: "ok", ok: null }} />
    </div>
  );
}

function Output({ output }: { output: BQNPreview }) {
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
    hasNotice: {
      color: "#888888",
      whiteSpace: "pre-wrap",
    },
  });
  let children = null;
  if (output.type === "ok") {
    children = output.ok;
  } else if (output.type === "error") {
    children = output.error;
  } else if (output.type === "notice") {
    children = output.notice;
  }
  return (
    <pre
      className={UI.cx(
        styles.root,
        output.type === "error" && styles.hasError,
        output.type === "notice" && styles.hasNotice,
      )}
    >
      {children}
    </pre>
  );
}

function Code({ code }: { code: string }) {
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
      textOverflow: "ellipsis",
      lineHeight: 1.4,
    },
  });
  return (
    <pre className={styles.root} dangerouslySetInnerHTML={{ __html: code }} />
  );
}
