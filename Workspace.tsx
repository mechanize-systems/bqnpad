/// <reference types="react-dom/next" />
/// <reference types="react/next" />
import * as Lib from "@bqnpad/lib";
import * as Autocomplete from "@codemirror/autocomplete";
import * as History from "@codemirror/history";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

import { Editor, ReactWidget } from "./Editor";
import * as EditorBQN from "./EditorBQN";
import { GlyphsPalette } from "./GlyphPalette";
import * as REPL from "./REPL";
import { REPLWebWorkerClient } from "./REPLWebWorkerClient";
import * as UI from "./UI";
import * as Workspace0 from "./Workspace0";
import type { WorkspaceManager } from "./WorkspaceManager";

export type WorkspaceProps = {
  manager: WorkspaceManager;
};

export function Workspace({ manager }: WorkspaceProps) {
  let workspace0 = manager.load().getOrSuspend();
  let doc0 = React.useMemo(
    () => State.Text.of(workspace0.doc.split("\n")),
    [workspace0],
  );
  let editor = React.useRef<null | View.EditorView>(null);

  let [{ status }, workspace] = useWorkspace(workspace0);

  let [onDoc] = Lib.ReactUtil.useDebouncedCallback(
    1000,
    (_doc, state: State.EditorState) => {
      manager.store((_) => workspace.toWorkspace0(state));
    },
    [manager, workspace],
  );

  let extensions = React.useMemo(
    () => [EditorBQN.bqn(), workspace.extension],
    [workspace],
  );

  let keybindings: View.KeyBinding[] = React.useMemo<View.KeyBinding[]>(() => {
    return [
      { key: "Mod-a", run: workspace.commands.selectCell },
      { key: "Shift-Enter", run: workspace.commands.addCell },
      { key: "Enter", run: workspace.commands.reuseCell },
      { key: "Tab", run: Autocomplete.startCompletion },
    ];
  }, [workspace]);

  let onGlyph = React.useCallback(
    (glyph: EditorBQN.Glyph) => {
      let view = editor.current!;
      if (!view.hasFocus) view.focus();
      let currentCell = workspace.query.currentCell(view.state);
      let { from, to } = view.state.selection.main;
      if (from < currentCell.from) {
        view.dispatch({
          changes: {
            from: currentCell.to,
            to: currentCell.to,
            insert: glyph.glyph,
          },
          selection: State.EditorSelection.cursor(currentCell.to + 1),
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: glyph.glyph },
          selection: State.EditorSelection.cursor(to + 1, 1),
        });
      }
    },
    [editor, workspace],
  );

  let onSave = React.useCallback(() => {
    let data = editor.current!.state.doc.sliceString(0);
    let blob = new Blob([data], { type: "text/csv" });
    download(blob, "bqnpad-workspace.bqn");
  }, []);

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
            {status != null && (
              <button className={styles.button}>
                VM {status.toUpperCase()}
              </button>
            )}
            <button
              className={styles.button}
              onClick={onSave}
              title="Download workspace"
            >
              DOWNLOAD
            </button>
            <button
              className={styles.button}
              onClick={() => manager.reset()}
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
        api={editor}
        doc={doc0}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
      />
    </div>
  );
}

type OutputProps = {
  output: null | Lib.PromiseUtil.Deferred<REPL.REPLResult>;
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
      ? ({ type: "notice", notice: "..." } as REPL.REPLResult)
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
  repl: REPL.IREPL;
  code: string;
  cell: WorkspaceCell;
};

function PreviewOutput({ code, cell, repl }: PreviewOutputProps) {
  let [output, setOutput] =
    React.useState<null | Lib.PromiseUtil.Deferred<REPL.REPLResult>>(null);
  let [compute, _flush, cancel] = Lib.ReactUtil.useDebouncedCallback(
    500,
    (code: string, output: Lib.PromiseUtil.Deferred<REPL.REPLResult>) => {
      repl.preview(code).then(output.resolve, output.reject);
      React.startTransition(() => setOutput(output));
    },
  );
  React.useEffect(() => {
    cancel();
    setOutput(null);
  }, [cell.idx]);
  React.useEffect(() => {
    if (code === "") {
      cancel();
      setOutput(null);
    } else {
      compute(code, cell.result!);
    }
  }, [code, cell.result]);
  return (
    <React.Suspense fallback={<Output output={null} />}>
      {output == null ? null : <Output output={output} preview={true} />}
    </React.Suspense>
  );
}

type Workspace = {
  query: {
    cells: (state: State.EditorState) => WorkspaceCell[];
    currentCell: (state: State.EditorState) => WorkspaceCell;
  };

  commands: {
    addCell: View.Command;
    selectCell: View.Command;
    reuseCell: View.Command;
  };

  extension: State.Extension[];
  toWorkspace0: (state: State.EditorState) => Workspace0.Workspace0;
};

export type WorkspaceCell = {
  idx: number;
  from: number;
  to: number;
  result: null | Lib.PromiseUtil.Deferred<REPL.REPLResult>;
  preview: null | Lib.PromiseUtil.Deferred<REPL.REPLResult>;
};

type WorkspaceState = {
  readonly status: REPL.REPLStatus | null;
};

function useWorkspace(
  workspace0: Workspace0.Workspace0 = Workspace0.empty,
): readonly [WorkspaceState, Workspace] {
  let repl = React.useMemo(() => {
    if (Lib.WorkerUtil.supportsWorkerModule()) {
      return new REPLWebWorkerClient();
    } else {
      // Those browsers (looking at you, Firefox) which don't support WebWorker
      // type=module will get in process REPL.
      //
      // - Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
      return new REPL.REPL();
    }
  }, []);
  let w = React.useMemo(() => workspace(repl, workspace0), [repl, workspace0]);
  let status = REPL.useREPLStatus(repl);
  return [{ status }, w] as const;
}

function workspace(
  repl: REPL.IREPL,
  workspace0: Workspace0.Workspace0 = Workspace0.empty,
): Workspace {
  let addCellEffect = State.StateEffect.define<WorkspaceCell>();
  let cellsField = State.StateField.define<WorkspaceCell[]>({
    create() {
      return workspace0.cells.map((cell, idx) => ({
        idx,
        from: cell.from,
        to: cell.to,
        result: null,
        preview: null,
      }));
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
    (state): WorkspaceCell => {
      let cells = state.field(cellsField);
      let from = cells[cells.length - 1]?.to ?? 0;
      let to = state.doc.length;
      return {
        idx: cells.length,
        from,
        to,
        result: Lib.PromiseUtil.deferred(),
        preview: null,
      };
    },
  );

  let outputWidgets = View.EditorView.decorations.compute(
    [cellsField],
    (state) => {
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
    },
  );

  let previewWidget: null | PreviewOutputWidget = null;

  let preview = View.EditorView.decorations.compute(["doc"], (state) => {
    let cell = state.facet(currentCellField)[0]!;
    let code = state.doc.sliceString(cell.from, cell.to);
    if (previewWidget == null) {
      previewWidget = new PreviewOutputWidget(cell, code, repl);
    }
    previewWidget.cell = cell;
    previewWidget.code = code;
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
    widget: new PlaceholderWidget("..."),
    side: 1,
  });

  let placeholder = View.EditorView.decorations.compute(
    ["doc", cellsField],
    (state) => {
      let { from, to } = currentCell(state);
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

  let startEval = View.ViewPlugin.fromClass(
    class {
      constructor(view: View.EditorView) {
        let state = view.state;
        let cells = query.cells(state);
        for (let cell of cells) {
          if (cell.result == null) {
            let code = state.doc.sliceString(cell.from, cell.to);
            cell.result = Lib.PromiseUtil.deferred();
            repl.eval(code).then(cell.result.resolve, cell.result.reject);
          }
        }
      }
    },
  );

  // Query

  let cells = (state: State.EditorState) => state.field(cellsField);
  let currentCell = (state: State.EditorState) =>
    state.facet(currentCellField)[0]!;

  let query = {
    cells,
    currentCell,
  };

  // Commands

  let addCell = (view: View.EditorView) => {
    let currentCell = query.currentCell(view.state);
    if (currentCell.to - currentCell.from === 0) return true;
    let cell: WorkspaceCell = {
      idx: currentCell.idx,
      from: currentCell.from,
      to: currentCell.to + 1,
      result: Lib.PromiseUtil.deferred(),
      preview: currentCell.result,
    };
    let code = view.state.doc.sliceString(currentCell.from, currentCell.to);
    repl.eval(code).then(cell.result!.resolve, cell.result!.reject);
    view.dispatch({
      changes: { from: currentCell.to, to: currentCell.to, insert: "\n" },
      effects: [addCellEffect.of(cell)],
      selection: State.EditorSelection.cursor(currentCell.to + 1),
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
  };

  let reuseCell = (view: View.EditorView) => {
    let currentCell = query.currentCell(view.state);
    if (view.state.selection.ranges.length !== 1) return false;
    let sel = view.state.selection.main;
    if (sel.from >= currentCell.from) return false;
    for (let cell of cells(view.state)) {
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
  };

  let selectCell = (view: View.EditorView) => {
    let currentCell = query.currentCell(view.state);
    let sel = view.state.selection.main;
    if (sel.from >= currentCell.from) {
      view.dispatch({
        selection: State.EditorSelection.range(
          currentCell.from,
          currentCell.to,
        ),
        userEvent: "select",
      });
      return true;
    }
    for (let cell of cells(view.state)) {
      if (sel.from >= cell.from && sel.to < cell.to) {
        view.dispatch({
          selection: State.EditorSelection.range(cell.from, cell.to - 1),
          userEvent: "select",
        });
        return true;
      }
    }
    return false;
  };

  let commands = { addCell, reuseCell, selectCell };

  let toWorkspace0 = (state: State.EditorState): Workspace0.Workspace0 => {
    let toWorkspaceCell0 = (
      cell: WorkspaceCell,
    ): Workspace0.WorkspaceCell0 => ({
      from: cell.from,
      to: cell.to,
    });
    return {
      doc: state.doc.sliceString(0),
      cells: cells(state).map(toWorkspaceCell0),
      currentCell: toWorkspaceCell0(currentCell(state)),
    };
  };

  return {
    query,
    commands,
    toWorkspace0,
    extension: [
      startEval.extension,
      ignoreCellEdits,
      cellsField,
      outputWidgets,
      computeCurrentCellField,
      preview,
      placeholder,
    ],
  };
}

class PlaceholderWidget extends View.WidgetType {
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
    readonly repl: REPL.IREPL,
  ) {
    super();
  }

  override render() {
    return (
      <PreviewOutput cell={this.cell} code={this.code} repl={this.repl} />
    );
  }

  override eq(_other: PreviewOutputWidget) {
    return false;
  }
}

function download(blob: Blob, filename: string) {
  let a = window.document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
