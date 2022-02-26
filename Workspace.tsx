/// <reference types="react-dom/next" />
/// <reference types="react/next" />
import * as PromiseUtil from "@bqnpad/lib/PromiseUtil";
import * as ReactUtil from "@bqnpad/lib/ReactUtil";
import * as Autocomplete from "@codemirror/autocomplete";
import * as History from "@codemirror/history";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

import { Editor, ReactWidget } from "./Editor";
import type { EditorProps } from "./Editor";
import * as EditorBQN from "./EditorBQN";
import type { IREPL, REPLResult } from "./REPL";
import { REPLWebWorkerClient, useREPLStatus } from "./REPLWebWorkerClient";
import * as UI from "./UI";
import { WORKSPACE_KEY } from "./app";

export type Workspace = {
  doc: State.Text;
  cells: WorkspaceCell[];
  currentCell: WorkspaceCell;
};

export type WorkspaceCell = {
  from: number;
  to: number;
  result: null | PromiseUtil.Deferred<REPLResult>;
  preview?: null | PromiseUtil.Deferred<REPLResult>;
};

export type WorkspaceManager = {
  load: () => PromiseUtil.Suspendable<Workspace>;
  store(fn: (workspace: Workspace) => Workspace): void;
};

export type WorkspaceProps = {
  manager: WorkspaceManager;
};

export function Workspace({ manager }: WorkspaceProps) {
  let workspace0 = manager.load().getOrSuspend();
  let repl = React.useMemo(() => new REPLWebWorkerClient(), [workspace0]);
  let status = useREPLStatus(repl);
  React.useEffect(() => {
    for (let cell of workspace0.cells) {
      if (cell.result == null) {
        let code = workspace0.doc.sliceString(cell.from, cell.to);
        cell.result = PromiseUtil.deferred();
        repl.eval(code).then(cell.result.resolve, cell.result.reject);
      }
    }
  }, [repl, workspace0]);
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
    [workspace, history],
  );

  let addCell = React.useCallback(
    (view: View.EditorView) => {
      let { currentCell } = workspace.getWorkspace(view.state);
      let { from, to } = currentCell;
      if (to - from === 0) return true;
      let cell: WorkspaceCell = {
        from,
        to: to + 1,
        result: PromiseUtil.deferred(),
        preview: currentCell.result ?? null,
      };
      let code = view.state.doc.sliceString(from, to);
      repl.eval(code).then(cell.result!.resolve, cell.result!.reject);
      view.dispatch({
        changes: { from: to, to, insert: "\n" },
        effects: [addCellEffect.of(cell)],
        selection: State.EditorSelection.cursor(to + 1),
        scrollIntoView: true,
      });
      // TODO: Below we reset history state to initial as we cannot back in time
      // after we've eval'ed some code.
      let history = view.state.field(History.historyField) as any;
      history.done = [];
      history.undone = [];
      history.prevTime = 0;
      history.prevUserEvent = undefined;
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
      { key: "Tab", run: Autocomplete.startCompletion },
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
      overflowY: "hidden",
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
            <button className={styles.button}>
              VM {status.toUpperCase()}
            </button>
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
        doc={workspace0.doc}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
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
      let title =
        glyph.title + "\n\n" + (glyph.key ? `\\-${glyph.key}` : glyph.glyph);
      return (
        <button
          title={title}
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

type OutputProps = {
  output: null | PromiseUtil.Deferred<REPLResult>;
  preview?: boolean;
};

function Output({ output: outputDeferred, preview }: OutputProps) {
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
  let output =
    outputDeferred == null
      ? ({ type: "notice", notice: "..." } as REPLResult)
      : outputDeferred.getOrSuspend();
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

type CellOutputProps = {
  cell: WorkspaceCell;
};

function CellOutput({ cell }: CellOutputProps) {
  return (
    <React.Suspense
      fallback={
        <Output output={cell.preview?.isResolved ? cell.preview : null} />
      }
    >
      <Output output={cell.result} />
    </React.Suspense>
  );
}

type PreviewOutputProps = {
  repl: IREPL;
  code: string;
  output: PromiseUtil.Deferred<REPLResult>;
};

function PreviewOutput({ code, output: output0, repl }: PreviewOutputProps) {
  let [output, setOutput] =
    React.useState<null | PromiseUtil.Deferred<REPLResult>>(output0);
  let [compute, _flush, cancel] = ReactUtil.useDebouncedCallback(
    500,
    (code: string, output: PromiseUtil.Deferred<REPLResult>) => {
      repl.preview(code).then(output.resolve, output.reject);
      React.startTransition(() => setOutput(output));
    },
  );
  React.useEffect(() => {
    if (code === "") {
      cancel();
      setOutput(null);
    } else {
      compute(code, output0);
    }
  }, [code, output0]);
  return (
    <React.Suspense fallback={<Output output={null} />}>
      {output == null ? null : <Output output={output} preview={true} />}
    </React.Suspense>
  );
}

class OutputWidget extends ReactWidget {
  constructor(readonly cell: WorkspaceCell) {
    super();
  }

  override render() {
    return <CellOutput cell={this.cell} />;
  }

  override eq(other: OutputWidget) {
    return other.cell === this.cell;
  }
}

class PreviewOutputWidget extends ReactWidget {
  constructor(
    public cell: WorkspaceCell,
    public code: string,
    readonly repl: IREPL,
  ) {
    super();
  }

  override render() {
    return (
      <PreviewOutput
        output={this.cell.result!}
        code={this.code}
        repl={this.repl}
      />
    );
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
  repl: IREPL,
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

  let currentCellField = State.Facet.define<WorkspaceCell>();

  let computeCurrentCellField = currentCellField.compute(
    ["doc", cellsField],
    (state) => {
      let cells = state.field(cellsField);
      let from = cells[cells.length - 1]?.to ?? 0;
      let to = state.doc.length;
      return { from, to, result: PromiseUtil.deferred() };
    },
  );

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

  let code: string;
  {
    let prevCell = workspace0.cells[workspace0.cells.length - 1];
    let from = prevCell?.to ?? 0;
    let to = workspace0.doc.length;
    code = workspace0.doc.sliceString(from, to);
  }
  let previewWidget = new PreviewOutputWidget(
    workspace0.currentCell,
    code,
    repl,
  );

  let preview = View.EditorView.decorations.compute(["doc"], (state) => {
    let cell = state.facet(currentCellField)[0]!;
    previewWidget.cell = cell;
    previewWidget.code = state.doc.sliceString(cell.from, cell.to);
    // TODO: investigate why CM doesn't update it
    previewWidget.updateDOM(previewWidget.container.dom);
    let deco = View.Decoration.widget({
      widget: previewWidget,
      block: true,
      side: 1,
    });
    return View.Decoration.set([deco.range(previewWidget.cell.to)]);
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
    let currentCell = state.facet(currentCellField)[0]!;
    return { doc: state.doc, cells, currentCell };
  };

  return {
    getWorkspace,
    extension: [
      ignoreCellEdits,
      cellsField,
      outputs,
      computeCurrentCellField,
      preview,
      placeholder,
    ],
  };
}

export function of(doc: State.Text): Workspace {
  return {
    doc,
    cells: [],
    currentCell: { from: 0, to: doc.length, result: null },
  };
}

function currentRange(workspace: Workspace) {
  let prevCell = workspace.cells[workspace.cells.length - 1];
  let from = prevCell?.to ?? 0;
  let to = workspace.doc.length;
  return [from, to] as const;
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
