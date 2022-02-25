/// <reference types="react-dom/next" />
import type { Suspendable } from "@bqnpad/lib/PromiseUtil";
import { useDebouncedCallback } from "@bqnpad/lib/ReactUtil";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Editor } from "./Editor";
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
  from: number;
  to: number;
  result?: BQNResult | null;
};

export type WorkspaceManager = {
  load: () => Suspendable<Workspace>;
  store(fn: (workspace: Workspace) => Workspace): void;
};

export type WorkspaceProps = {
  manager: WorkspaceManager;
};

export function Workspace({ manager }: WorkspaceProps) {
  let workspace0 = manager.load().getOrSuspend();
  let workspace = React.useMemo(
    () => workspaceExtension(workspace0),
    [workspace0],
  );
  let repl = React.useMemo(() => {
    let repl = new REPL();
    for (let cell of workspace0.cells) {
      let code = workspace0.current.sliceString(cell.from, cell.to);
      cell.result = repl.eval(code);
    }
    return repl;
  }, [workspace0]);
  let [preview, setPreview, resetPreview] = usePreview(workspace, repl);
  let onDoc: EditorProps["onDoc"] = React.useCallback(
    (doc, state) => {
      setPreview(doc, state);
      manager.store((_) => workspace.getWorkspace(state));
    },
    [manager, setPreview, workspace],
  );
  let inputMethod = useInputMethod();
  let extensions = React.useMemo(
    () => [EditorBQN.bqn(), inputMethod, workspace.extension],
    [workspace, inputMethod],
  );

  let addCell = React.useCallback(
    (view: View.EditorView) => {
      let [from, to] = currentRange(workspace.getWorkspace(view.state));
      if (to - from === 0) return true;
      let code = view.state.doc.sliceString(from, to);
      let result = repl.eval(code);
      let cell: WorkspaceCell = { from, to: to + 1, result };
      view.dispatch({
        changes: { from: to, to, insert: "\n" },
        effects: [addCellEffect.of(cell)],
        selection: State.EditorSelection.cursor(to + 1),
        scrollIntoView: true,
      });
      resetPreview();
      return true;
    },
    [workspace, resetPreview],
  );

  let maybeRestoreCell = React.useCallback((view: View.EditorView) => {
    let w = workspace.getWorkspace(view.state);
    let [from, _to] = currentRange(w);
    if (view.state.selection.ranges.length !== 1) return false;
    let sel = view.state.selection.main;
    if (sel.from >= from) return false;
    for (let cell of w.cells) {
      if (sel.from >= cell.from && sel.to < cell.to) {
        addCell(view);
        let code = view.state.doc.sliceString(cell.from, cell.to - 1);
        let to = view.state.doc.length;
        view.dispatch({
          changes: { from: to, to, insert: code },
          selection: State.EditorSelection.cursor(to),
          scrollIntoView: true,
        });
        return true;
      }
    }
    return false;
  }, []);

  let selectCurrentCell = React.useCallback((view: View.EditorView) => {
    let w = workspace.getWorkspace(view.state);
    let [from, to] = currentRange(w);
    let sel = view.state.selection.main;
    if (sel.from >= from) {
      view.dispatch({ selection: State.EditorSelection.range(from, to) });
      return true;
    }
    for (let cell of w.cells) {
      if (sel.from >= cell.from && sel.to < cell.to) {
        view.dispatch({
          selection: State.EditorSelection.range(cell.from, cell.to - 1),
        });
        return true;
      }
    }
    return false;
  }, []);

  let keybindings: View.KeyBinding[] = React.useMemo(
    () => [
      {
        key: "Shift-Enter",
        run: addCell,
      },
      {
        key: "Enter",
        run: maybeRestoreCell,
      },
      { key: "Mod-a", run: selectCurrentCell },
    ],
    [addCell, maybeRestoreCell],
  );

  let styles = UI.useStyles({
    root: {
      display: "flex",
      flexDirection: "column",
    },
  });

  return (
    <div className={styles.root}>
      <Editor
        doc={workspace0.current}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
        placeholder="BQN)"
      />
      <Output
        preview={true}
        output={preview ?? repl.preview(currentCode(workspace0))}
      />
    </div>
  );
}

function Output({
  output,
  preview,
}: {
  output: BQNPreview;
  preview?: boolean;
}) {
  let styles = UI.useStyles({
    root: {
      fontFamily: `"Iosevka Term Web", Menlo, Monaco, monospace`,
      fontSize: "20px",
      lineHeight: "1.4",
      overflowY: "hidden",
      overflowX: "hidden",
      marginTop: "0px",
      marginBottom: "0px",
      marginLeft: "0px",
      marginRight: "0px",
      paddingLeft: "35px",
      textOverflow: "ellipsis",
    },
    hasPreview: {
      color: "#888",
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
        preview && styles.hasPreview,
        output.type === "error" && styles.hasError,
        output.type === "notice" && styles.hasNotice,
      )}
    >
      {children}
    </pre>
  );
}

class CellOutputWidget extends View.WidgetType {
  _container: null | {
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

  constructor(
    readonly cell: WorkspaceCell,
    readonly preview: boolean = false,
  ) {
    super();
  }

  override eq(other: CellOutputWidget) {
    return other.cell == this.cell;
  }

  toDOM() {
    this.container.root.render(
      <Output output={this.cell.result!} preview={this.preview} />,
    );
    return this.container.dom;
  }

  override ignoreEvent() {
    return true;
  }
}

let addCellEffect = State.StateEffect.define<WorkspaceCell>();

type WorkspaceState = {
  extension: State.Extension[];
  getWorkspace: (state: State.EditorState) => Workspace;
};

function workspaceExtension(workspace0: Workspace): WorkspaceState {
  const field = State.StateField.define<WorkspaceCell[]>({
    create() {
      return workspace0.cells;
    },
    update(state, tr) {
      let nextState = state;
      for (let e of tr.effects)
        if (e.is(addCellEffect)) {
          if (nextState === state) nextState = nextState.slice(0);
          let cell = e.value;
          nextState.push(cell);
        }
      return nextState;
    },
    provide(field) {
      let outputs = View.EditorView.decorations.compute([field], (state) => {
        let cells = state.field(field);
        if (cells.length === 0) return View.Decoration.none;
        else
          return View.Decoration.set(
            cells.map((cell) => {
              let widget = new CellOutputWidget(cell);
              let deco = View.Decoration.widget({
                widget,
                block: true,
                side: -1,
              });
              return deco.range(cell.to);
            }),
          );
      });
      return [outputs];
    },
  });

  let ignoreCellEdit = State.EditorState.transactionFilter.of(
    (tr: State.Transaction) => {
      if (tr.docChanged) {
        let cells = tr.startState.field(field);
        let prevCell = cells[cells.length - 1];
        let cut = prevCell?.to ?? 0;
        let block = false;
        tr.changes.iterChangedRanges((from, to) => {
          if (from < cut || to < cut) block = true;
        });
        if (block) return [] as State.TransactionSpec[];
      }
      return tr as State.TransactionSpec;
    },
  );

  let getWorkspace = (state: State.EditorState): Workspace => {
    let cells = state.field(field);
    return { current: state.doc, cells };
  };

  return {
    getWorkspace,
    extension: [ignoreCellEdit, field],
  };
}

function currentRange(workspace: Workspace) {
  let prevCell = workspace.cells[workspace.cells.length - 1];
  let from = prevCell?.to ?? 0;
  let to = workspace.current.length;
  return [from, to] as const;
}

function currentCode(workspace: Workspace) {
  let [from, to] = currentRange(workspace);
  let code = workspace.current.sliceString(from, to);
  return code;
}

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

    // Try to see if we can preview expressions which end with LHS←RHS
    let tree = EditorBQN.language.parser.parse(codeString);
    let c = tree.cursor();
    if (c.lastChild()) {
      // Skip nodes which won't influence result
      let safeNodes = new Set(["DELIM", "COMMENT"]);
      while (safeNodes.has(c.node.type.name)) c.prevSibling();
      // If the last node is LHS←RHS
      if (c.node.type.name === "ASSIGN" && c.firstChild()) {
        let from = c.from;
        if (c.nextSibling()) {
          // Keep only RHS and replace LHS← with spaces (to preserve error
          // locations).
          let to = c.from;
          let ws = State.Text.of([new Array(to - from).fill(" ").join()]);
          codeString =
            codeString.substring(0, from) + ws + codeString.substring(to);
        }
      }
    }

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

function usePreview(workspaceState: WorkspaceState, repl: REPL) {
  let [preview, setPreview0] = React.useState<null | BQNPreview>(null);
  let [setPreview, _finalize, cancel] = useDebouncedCallback(
    500,
    (_doc: State.Text, state: State.EditorState) => {
      let workspace = workspaceState.getWorkspace(state);
      let code = currentCode(workspace);
      setPreview0(repl.preview(code));
    },
    [setPreview0, workspaceState, repl],
  );
  let resetPreview = () => {
    cancel();
    setPreview0({ type: "ok", ok: null });
  };
  return [preview, setPreview, resetPreview] as const;
}

function useInputMethod(): State.Extension {
  let expecting = React.useRef<null | NodeJS.Timeout>(null);
  React.useEffect(
    () => () => {
      if (expecting.current != null) clearTimeout(expecting.current);
    },
    [],
  );
  return React.useMemo(
    () =>
      State.EditorState.transactionFilter.of((tr) => {
        if (!tr.isUserEvent("input")) return [tr] as State.TransactionSpec[];

        let pos = null as
          | { type: "expect" }
          | { type: "input"; from: number; to: number; ch: string }
          | null;

        tr.changes.iterChanges((fa, ta, _fb, _tb, ins) => {
          if (ins.length !== 1) return;
          let ch = ins.sliceString(0);
          if (ch === "\\") {
            pos = { type: "expect" };
          } else if (
            tr.startState.doc.sliceString(fa - 1, ta) === "\\" &&
            expecting.current != null
          ) {
            if (expecting.current != null) clearTimeout(expecting.current);
            pos = { type: "input", from: fa - 1, to: ta, ch };
          }
        });

        if (pos?.type === "expect") {
          if (expecting.current != null) clearTimeout(expecting.current);
          expecting.current = setTimeout(() => {
            expecting.current = null;
          }, 500);
        } else if (pos?.type === "input") {
          let insert = KEYMAP[pos.ch];
          if (insert != null)
            return {
              changes: { from: pos.from, to: pos.to, insert },
            } as State.TransactionSpec;
        }
        return [tr] as State.TransactionSpec[];
      }),
    [],
  );
}

let KEYMAP: Record<string, string> = {
  "`": "˜",
  "1": "˘",
  "2": "¨",
  "3": "⁼",
  "4": "⌜",
  "5": "´",
  "6": "˝",
  "7": "7",
  "8": "∞",
  "9": "¯",
  "0": "•",
  "-": "÷",
  "=": "×",
  "~": "¬",
  "!": "⎉",
  "@": "⚇",
  "#": "⍟",
  $: "◶",
  "%": "⊘",
  "^": "⎊",
  "(": "⟨",
  ")": "⟩",
  _: "√",
  "+": "⋆",
  q: "⌽",
  w: "𝕨",
  e: "∊",
  r: "↑",
  t: "∧",
  u: "⊔",
  i: "⊏",
  o: "⊐",
  p: "π",
  "[": "←",
  "]": "→",
  W: "𝕎",
  E: "⍷",
  R: "𝕣",
  T: "⍋",
  Y: "Y",
  U: "U",
  I: "⊑",
  O: "⊒",
  "{": "⊣",
  "}": "⊢",
  a: "⍉",
  s: "𝕤",
  d: "↕",
  f: "𝕗",
  g: "𝕘",
  h: "⊸",
  j: "∘",
  k: "○",
  l: "⟜",
  ";": "⋄",
  "'": "↩",
  S: "𝕊",
  F: "𝔽",
  G: "𝔾",
  H: "«",
  K: "⌾",
  L: "»",
  ":": "·",
  z: "⥊",
  '"': "˙",
  x: "𝕩",
  c: "↓",
  v: "∨",
  b: "⌊",
  m: "≡",
  ",": "∾",
  ".": "≍",
  "/": "≠",
  Z: "⋈",
  X: "𝕏",
  V: "⍒",
  B: "⌈",
  M: "≢",
  "<": "≤",
  ">": "≥",
  "?": "⇐",
};
