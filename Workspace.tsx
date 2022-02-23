import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

import { Editor, highlight, peerExtension } from "./Editor";
import * as LangBQN from "./LangBQN";
import { useDebouncedCallback } from "./ReactUtil";
import * as UI from "./UI";
import type { WorkspaceConnection } from "./WorkspaceConnection";
import type * as API from "./api";
import * as BQN from "./bqn";

type BQNResult =
  | { type: "ok"; ok: null | string }
  | { type: "error"; error: string };

type BQNPreview = BQNResult | { type: "notice"; notice: string };

export type WorkspaceProps = {
  conn: WorkspaceConnection;
};

export function Workspace({ conn }: WorkspaceProps) {
  let {
    doc: { doc, version },
    workspace: { workspace: workspace0 },
  } = conn.initial().getOrSuspend();
  let repl = React.useMemo(() => BQN.makerepl(BQN.sysargs, 1), []);
  let evalBQN = React.useCallback(
    (code: State.Text | string): BQNResult => {
      let codeString = typeof code === "string" ? code : code.sliceString(0);
      if (codeString.trim().length === 0) return { type: "ok", ok: null };
      try {
        let value = repl(codeString);
        return { type: "ok", ok: BQN.fmt(value) };
      } catch (e) {
        return { type: "error", error: BQN.fmtErr(e) };
      }
    },
    [repl],
  );
  let previewBQN = React.useCallback(
    (code: State.Text | string): BQNPreview => {
      let codeString = typeof code === "string" ? code : code.sliceString(0);
      if (codeString.trim().length === 0) return { type: "ok", ok: null };
      try {
        BQN.allowSideEffect(false);
        let value = repl(codeString);
        BQN.allowSideEffect(true);
        return { type: "ok", ok: BQN.fmt(value) };
      } catch (e) {
        if (e.kind === "sideEffect")
          return {
            type: "notice",
            notice:
              "cannot preview this expression as it produces side effects, submit expression (Shift+Enter) to see its result",
          };
        return { type: "error", error: BQN.fmtErr(e) };
      } finally {
        BQN.allowSideEffect(true);
      }
    },
    [repl],
  );
  let [workspace, setWorkspace] = React.useState<API.Workspace>(
    () => workspace0,
  );
  let [preview, setPreview] = React.useState<BQNPreview>(() => evalBQN(doc));
  let [onDoc, _onDocFinalize, onDocCancel] = useDebouncedCallback(
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
      setPreview(previewBQN(doc));
    },
    [setPreview, evalBQN],
  );
  let editor = React.useRef<null | View.EditorView>(null);
  let extensions = React.useMemo(
    () => [peerExtension(conn, version)],
    [conn, version],
  );
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
          let cell = { code };
          setWorkspace((w) => ({ cells: w.cells.concat(cell) }));
          conn.pushWorkspaceUpdates([
            { type: "AddCell", cell, clientID: conn.clientID },
          ]);
          setPreview({ type: "ok", ok: null });
          onDocCancel();
          view.dispatch({
            changes: { from: 0, to: code.length, insert: "" },
          });
          return true;
        },
      },
    ],
    [setWorkspace],
  );
  return (
    <div className={styles.root}>
      {workspace.cells.map((cell, idx) => (
        <RenderCell key={idx} cell={cell} evalBQN={evalBQN} />
      ))}
      <Editor
        api={editor}
        doc={doc}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
      />
      <Output output={preview} />
    </div>
  );
}

function RenderCell({
  cell,
  evalBQN,
}: {
  cell: API.WorkspaceCell;
  evalBQN: (code: string) => BQNResult;
}) {
  let result = React.useMemo(() => evalBQN(cell.code), [evalBQN, cell.code]);
  let code = React.useMemo(
    () => highlight(cell.code, LangBQN.language, LangBQN.highlight),
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
      <Output output={result} />
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
  } else {
    let _: never = output;
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
