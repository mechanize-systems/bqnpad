/// <reference types="react-dom/next" />
import type { Suspendable } from "@bqnpad/lib/PromiseUtil";
import { useDebouncedCallback } from "@bqnpad/lib/ReactUtil";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

import { Editor, ReactWidget } from "./Editor";
import type { EditorProps } from "./Editor";
import * as EditorBQN from "./EditorBQN";
import * as UI from "./UI";
import { WORKSPACE_KEY } from "./app";
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
  let repl = React.useMemo(() => {
    let repl = new REPL();
    for (let cell of workspace0.cells) {
      let code = workspace0.current.sliceString(cell.from, cell.to);
      cell.result = repl.eval(code);
    }
    return repl;
  }, [workspace0]);
  let workspace = React.useMemo(
    () => workspaceExtension(repl, workspace0),
    [repl, workspace0],
  );
  let onDoc: EditorProps["onDoc"] = React.useCallback(
    (_doc, state) => {
      manager.store((_) => workspace.getWorkspace(state));
    },
    [manager, workspace],
  );
  let extensions = React.useMemo(
    () => [EditorBQN.bqn(), workspace.extension],
    [workspace],
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
      return true;
    },
    [workspace],
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
      view.dispatch({
        selection: State.EditorSelection.range(from, to),
        userEvent: "select",
      });
      return true;
    }
    for (let cell of w.cells) {
      if (sel.from >= cell.from && sel.to < cell.to) {
        view.dispatch({
          selection: State.EditorSelection.range(cell.from, cell.to - 1),
          userEvent: "select",
        });
        return true;
      }
    }
    return false;
  }, []);

  let keybindings: View.KeyBinding[] = React.useMemo<View.KeyBinding[]>(() => {
    return [
      { key: "Mod-a", run: selectCurrentCell },
      { key: "Shift-Enter", run: addCell },
      { key: "Enter", run: maybeRestoreCell },
    ];
  }, [addCell, maybeRestoreCell, selectCurrentCell]);

  let api = React.useRef<null | View.EditorView>(null);

  let onGlyph = React.useCallback(
    (glyph: EditorBQN.Glyph) => {
      let view = api.current;
      if (view == null) return;
      if (!view.hasFocus) {
        view.focus();
      }
      let [cfrom, cto] = currentRange(workspace.getWorkspace(view.state));
      let { from, to } = view.state.selection.main;
      if (from < cfrom) {
        view.dispatch({
          changes: { from: cto, to: cto, insert: glyph.glyph },
          selection: State.EditorSelection.cursor(cto + 1),
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: glyph.glyph },
          selection: State.EditorSelection.cursor(to + 1, 1),
        });
      }
    },
    [api, workspace],
  );

  let onResetWorkspace = () => {
    window.localStorage.removeItem(WORKSPACE_KEY);
    window.location.reload();
  };

  let styles = UI.useStyles({
    root: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
    header: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      paddingLeft: "5px",
      paddingRight: "5px",
      paddingTop: "5px",
      paddingBottom: "5px",
      borderBottomWidth: "2px",
      borderBottomStyle: "solid",
      borderBottomColor: "#BBB",
    },
    toolbar: {
      fontWeight: "bold",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    title: {
      fontSize: "20px",
    },
    glyphs: {},
    button: {
      fontWeight: "bold",
      backgroundColor: "transparent",
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      paddingLeft: "5px",
      paddingRight: "5px",
      paddingTop: "5px",
      paddingBottom: "5px",
      "&:hover": {
        backgroundColor: "#DDD",
      },
      "&:active": {
        backgroundColor: "#CCC",
      },
    },
  });

  let onSave = React.useCallback(() => {
    let data = api.current?.state.doc.sliceString(0);
    if (data == null) return;
    let blob = new Blob([data], { type: "text/csv" });
    let a = window.document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = "bqnpad-workspace.bqn";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.toolbar}>
          <div className={styles.title}>
            <span style={{ fontWeight: "bold" }}>
              <a href="https://mlochbaum.github.io/BQN/index.html">BQN</a>
              PAD.MECHANIZE.SYSTEMS
            </span>
          </div>
          <div>
            <button
              className={styles.button}
              onClick={onSave}
              title="Download workspace"
            >
              DOWNLOAD
            </button>
            <button
              className={styles.button}
              onClick={onResetWorkspace}
              title="Discard everything and start from scratch"
            >
              RESET
            </button>
          </div>
        </div>
        <div className={styles.glyphs}>
          <GlyphsPalette onClick={onGlyph} />
        </div>
      </div>
      <Editor
        api={api}
        doc={workspace0.current}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
        placeholder="BQN)"
      />
    </div>
  );
}

type GlyphsPaletteProps = {
  onClick: (glyph: EditorBQN.Glyph) => void;
};

function GlyphsPalette({ onClick }: GlyphsPaletteProps) {
  let styles = UI.useStyles({
    root: {
      display: "flex",
      flexDirection: "row",
      fontSize: "20px",
      width: "100%",
      flexWrap: "wrap",
    },
    item: {
      backgroundColor: "transparent",
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      paddingLeft: "5px",
      paddingRight: "5px",
      paddingTop: "5px",
      paddingBottom: "5px",
      "&:hover": {
        backgroundColor: "#DDD",
      },
      "&:active": {
        backgroundColor: "#CCC",
      },
    },
  });
  let chars = React.useMemo(() => {
    return EditorBQN.glyphs.map((glyph) => {
      let className =
        glyph.tag != null
          ? EditorBQN.highlight.match(glyph.tag, null as any) ?? undefined
          : undefined;
      return (
        <button
          key={glyph.glyph}
          onClick={() => onClick(glyph)}
          className={UI.cx(styles.item, className)}
        >
          {glyph.glyph}
        </button>
      );
    });
  }, [onClick]);
  return <div className={styles.root}>{chars}</div>;
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

function PreviewOutput({ code, repl }: { code: string; repl: REPL }) {
  let [output, setOutput] = React.useState<BQNPreview | null>({
    type: "ok",
    ok: null,
  });
  let [compute] = useDebouncedCallback(
    500,
    (code: string) => {
      let output = repl.preview(code);
      setOutput(output);
    },
    [],
  );
  React.useEffect(() => {
    compute(code);
  }, [code]);
  return output != null ? <Output output={output} preview={true} /> : null;
}

class OutputWidget extends ReactWidget {
  constructor(
    readonly cell: WorkspaceCell,
    readonly preview: boolean = false,
  ) {
    super();
  }

  override render() {
    return <Output output={this.cell.result!} preview={this.preview} />;
  }

  override eq(other: OutputWidget) {
    return other.cell === this.cell && other.preview === this.preview;
  }
}

class PreviewOutputWidget extends ReactWidget {
  code: string;
  readonly repl: REPL;
  constructor(code: string, repl: REPL) {
    super();
    this.code = code;
    this.repl = repl;
  }

  override render() {
    return <PreviewOutput code={this.code} repl={this.repl} />;
  }

  override eq(_other: PreviewOutputWidget) {
    return false;
  }
}

let addCellEffect = State.StateEffect.define<WorkspaceCell>();

type WorkspaceState = {
  extension: State.Extension[];
  getWorkspace: (state: State.EditorState) => Workspace;
};

function workspaceExtension(
  repl: REPL,
  workspace0: Workspace,
): WorkspaceState {
  let cellsField = State.StateField.define<WorkspaceCell[]>({
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
  });

  let outputs = View.EditorView.decorations.compute([cellsField], (state) => {
    let cells = state.field(cellsField);
    if (cells.length === 0) return View.Decoration.none;
    else
      return View.Decoration.set(
        cells.map((cell) => {
          let widget = new OutputWidget(cell);
          let deco = View.Decoration.widget({
            widget,
            block: true,
            side: -1,
          });
          return deco.range(cell.to);
        }),
      );
  });

  let code = currentCode(workspace0);
  let previewWidget = new PreviewOutputWidget(code, repl);

  let preview = View.EditorView.decorations.compute(["doc"], (state) => {
    let workspace = getWorkspace(state);
    let [_from, to] = currentRange(workspace);
    let code: string = currentCode(workspace);
    if (code.trim() === "") return View.Decoration.none;
    previewWidget.code = code;
    // TODO: investigate why CM doesn't update it
    previewWidget.updateDOM(previewWidget.container.dom);
    let deco = View.Decoration.widget({
      widget: previewWidget,
      block: true,
      side: 1,
    });
    return View.Decoration.set([deco.range(to)]);
  });

  let placeholderWidget = View.Decoration.widget({
    widget: new Placeholder("..."),
    side: 1,
  });

  let placeholder = View.EditorView.decorations.compute(
    ["doc", cellsField],
    (state) => {
      let [from, to] = currentRange(getWorkspace(state));
      if (from - to === 0)
        return View.Decoration.set([placeholderWidget.range(from)]);
      else return View.Decoration.none;
    },
  );

  let ignoreCellEdits = State.EditorState.transactionFilter.of(
    (tr: State.Transaction) => {
      if (tr.docChanged) {
        let cells = tr.startState.field(cellsField);
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
    let cells = state.field(cellsField);
    return { current: state.doc, cells };
  };

  return {
    getWorkspace,
    extension: [ignoreCellEdits, cellsField, outputs, preview, placeholder],
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

class Placeholder extends View.WidgetType {
  constructor(readonly content: string | HTMLElement) {
    super();
  }

  toDOM() {
    let wrap = document.createElement("span");
    wrap.className = "cm-placeholder";
    wrap.style.pointerEvents = "none";
    wrap.appendChild(
      typeof this.content == "string"
        ? document.createTextNode(this.content)
        : this.content,
    );
    if (typeof this.content == "string")
      wrap.setAttribute("aria-label", "placeholder " + this.content);
    else wrap.setAttribute("aria-hidden", "true");
    return wrap;
  }

  override ignoreEvent() {
    return false;
  }
}
