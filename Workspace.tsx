/// <reference types="react-dom/next" />
/// <reference types="react/next" />
import * as Lib from "@bqnpad/lib";
import * as Autocomplete from "@codemirror/autocomplete";
import * as History from "@codemirror/history";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as React from "react";

import * as Editor from "./Editor";
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

  let [showGlyphbar, setShowGlyphbar] = Lib.ReactUtil.usePersistentState(
    "bqnpad-pref-showGlyphbar",
    () => true,
  );

  let [enableLivePreview, setEnableLivePreview] =
    Lib.ReactUtil.usePersistentState(
      "bqnpad-pref-enableLivePreview",
      () => true,
    );

  let config = Editor.useStateField<WorkspaceConfig>(
    editor,
    { enableLivePreview },
    [enableLivePreview],
  );
  let [{ status }, workspace] = useWorkspace(workspace0, config);

  React.useEffect(() => {
    workspace.commands.focusCurrentCell(editor.current!);
  }, [editor, workspace]);

  let [onDoc, _onDocFlush, onDocCancel] = Lib.ReactUtil.useDebouncedCallback(
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
  }, [editor]);

  let onNew = React.useCallback(() => {
    let state = editor.current!.state;
    let { doc, currentSession, prevSessions, currentCell } =
      workspace.toWorkspace0(state);
    doc = doc.slice(0, currentCell.from);
    currentCell = {
      from: doc.length,
      to: doc.length,
      result: null,
    };
    if (currentSession.cells.length === 0) return;
    if (!doc.endsWith("\n")) doc += "\n";
    let newW: Workspace0.Workspace0 = {
      doc,
      prevSessions: prevSessions.concat(currentSession),
      currentSession: {
        createdAt: Date.now(),
        cells: [],
      },
      currentCell: {
        from: doc.length,
        to: doc.length + 1,
        result: null,
      },
    };
    onDocCancel();
    manager.store((_) => newW);
    manager.restart();
  }, [editor]);

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
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
    },
    toolbarSection: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      paddingRight: "10px",
    },
    title: {
      fontSize: "20px",
    },
    glyphs: {},
    label: {
      color: "#888",
    },
    element: {
      paddingLeft: "5px",
      paddingRight: "5px",
      paddingTop: "5px",
      paddingBottom: "5px",
    },
    statusIdle: { color: "green" },
    statusRunning: { color: "orange" },
  });

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.toolbar}>
          <div className={styles.title}>
            <span style={{ fontWeight: "bold" }}>
              <a href="https://mlochbaum.github.io/BQN/index.html">BQN</a>
              PAD
            </span>
          </div>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.toolbarSection}>
            <div className={styles.label}>SESSION: </div>
            <UI.Button
              title="Create new session"
              onClick={() => {
                onNew();
              }}
            >
              NEW
            </UI.Button>
            <UI.Button
              title="Restart current session"
              onClick={() => manager.restart()}
            >
              RESTART
            </UI.Button>
            <UI.Button
              title="Download workspace as .bqn source file"
              onClick={onSave}
            >
              DOWNLOAD
            </UI.Button>
          </div>
          {status != null && (
            <div className={styles.toolbarSection}>
              <div className={styles.label}>VM: </div>
              <div
                className={UI.cx(
                  styles.element,
                  status === "idle" && styles.statusIdle,
                  status === "running" && styles.statusRunning,
                )}
              >
                {status.toUpperCase().padEnd(7, "\u00A0")}
              </div>
            </div>
          )}
          <div className={styles.toolbarSection}>
            <div className={styles.label}>PREFERENCES: </div>
            <UI.Checkbox
              value={enableLivePreview}
              onValue={setEnableLivePreview}
            >
              LIVE PREVIEW
            </UI.Checkbox>
            <UI.Checkbox value={showGlyphbar} onValue={setShowGlyphbar}>
              SHOW GLYPHBAR
            </UI.Checkbox>
          </div>
        </div>
        {showGlyphbar && (
          <div className={styles.glyphs}>
            <GlyphsPalette onClick={onGlyph} />
          </div>
        )}
      </div>
      <Editor.Editor
        api={editor}
        doc={doc0}
        onDoc={onDoc}
        extensions={extensions}
        keybindings={keybindings}
      />
    </div>
  );
}

function useWorkspace(
  workspace0: Workspace0.Workspace0 = Workspace0.empty,
  config: WorkspaceConfig | State.StateField<WorkspaceConfig>,
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
  let w = React.useMemo(
    () => workspace(repl, workspace0, config),
    [repl, workspace0],
  );
  let status = REPL.useREPLStatus(repl);
  return [{ status }, w] as const;
}

type WorkspaceConfig = {
  enableLivePreview: boolean;
};

type Workspace = {
  query: {
    currentCell: (state: State.EditorState) => WorkspaceCell;
    prevCells: (state: State.EditorState) => Iterable<WorkspaceCell>;
    cells: (state: State.EditorState) => Iterable<WorkspaceCell>;
    allCells: (state: State.EditorState) => Iterable<WorkspaceCell>;
  };

  commands: {
    addCell: View.Command;
    selectCell: View.Command;
    reuseCell: View.Command;
    focusCurrentCell: View.Command;
  };

  extension: State.Extension[];
  toWorkspace0: (state: State.EditorState) => Workspace0.Workspace0;
};

export type WorkspaceCell = {
  idx: number;
  from: number;
  to: number;
  result: null | Lib.PromiseUtil.Deferred<REPL.REPLResult>;
  resultPreview: null | REPL.REPLResult;
};

type WorkspaceState = {
  readonly status: REPL.REPLStatus | null;
};

function workspace(
  repl: REPL.IREPL,
  workspace0: Workspace0.Workspace0 = Workspace0.empty,
  config0: WorkspaceConfig | State.StateField<WorkspaceConfig>,
): Workspace {
  let config =
    config0 instanceof State.StateField
      ? config0
      : State.StateField.define({
          create() {
            return config0;
          },
          update(config) {
            return config;
          },
        });

  let prevCellsField = State.StateField.define<WorkspaceCell[]>({
    create() {
      return workspace0.prevSessions.flatMap((session) =>
        session.cells.map(
          (cell, idx): WorkspaceCell => ({
            idx,
            from: cell.from,
            to: cell.to,
            result: null,
            resultPreview: cell.result,
          }),
        ),
      );
    },
    update(state) {
      return state;
    },
  });

  let addCellEffect = State.StateEffect.define<WorkspaceCell>();
  let cellsField = State.StateField.define<WorkspaceCell[]>({
    create() {
      return workspace0.currentSession.cells.map(
        (cell, idx): WorkspaceCell => ({
          idx,
          from: cell.from,
          to: cell.to,
          result: null,
          resultPreview: cell.result,
        }),
      );
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
      let cells: { from: number; to: number }[] = state.field(cellsField);
      if (cells.length === 0) {
        let session =
          workspace0.prevSessions[workspace0.prevSessions.length - 1];
        cells = session?.cells ?? [];
      }
      let from = cells[cells.length - 1]?.to ?? 0;
      let to = state.doc.length;
      return {
        idx: cells.length,
        from,
        to,
        result: Lib.PromiseUtil.deferred(),
        resultPreview: null,
      };
    },
  );

  let prevOutputWidgets = View.EditorView.decorations.compute(
    [prevCellsField],
    (state) => {
      let cells = state.field(prevCellsField);
      if (cells.length === 0) return View.Decoration.none;
      else
        return View.Decoration.set(
          cells.map((cell) => {
            let widget = new CellOutputWidget(cell, false);
            let deco = View.Decoration.widget({
              widget,
              block: true,
              side: 1,
            });
            return deco.range(cell.to - 1);
          }),
        );
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
            let widget = new CellOutputWidget(cell, true);
            let deco = View.Decoration.widget({
              widget,
              block: true,
              side: 1,
            });
            return deco.range(cell.to - 1);
          }),
        );
    },
  );

  let sessionBanner = View.EditorView.decorations.compute([], (_state) => {
    let ranges: View.Range<View.Decoration>[] = [];

    let add = (
      session: Workspace0.Session0,
      pos: number | undefined = undefined,
    ) => {
      let firstCell = session.cells[0];
      let from =
        firstCell == null || firstCell.from === firstCell.to
          ? pos
          : firstCell.from;
      if (from == null) return;
      let deco = View.Decoration.widget({
        widget: new LineWidget(session.createdAt),
        block: true,
        side: -1,
      });
      ranges.push(deco.range(from));
    };

    for (let session of workspace0.prevSessions) add(session);
    add(workspace0.currentSession, workspace0.currentCell.from);

    return View.Decoration.set(ranges);
  });

  let previewWidget: null | PreviewOutputWidget = null;

  let preview = View.EditorView.decorations.compute(
    ["doc", config],
    (state) => {
      let { enableLivePreview } = state.field(config);
      if (!enableLivePreview) return View.Decoration.none;
      let cell = state.facet(currentCellField)[0]!;
      let code = state.doc.sliceString(cell.from, cell.to);
      if (previewWidget == null)
        previewWidget = new PreviewOutputWidget(cell, code, repl);
      previewWidget.cell = cell;
      previewWidget.code = code;
      // TODO: investigate why CM doesn't update it
      // previewWidget.updateDOM(previewWidget.container.dom);
      let deco = View.Decoration.widget({
        widget: previewWidget,
        block: true,
        side: 1,
      });
      return View.Decoration.set([deco.range(previewWidget.cell.to)]);
    },
  );

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
        let currentCell = query.currentCell(tr.startState);
        let cut = currentCell.from;
        let block = false;
        tr.changes.iterChangedRanges((from, to) => {
          if (from < cut || to < cut) block = true;
        });
        if (block) return [] as State.TransactionSpec[];
      }
      return tr as State.TransactionSpec;
    },
  );

  let onInit = View.ViewPlugin.fromClass(
    class {
      constructor(view: View.EditorView) {
        let state = view.state;
        // Start evaluating cells
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

  let onSelection = View.ViewPlugin.fromClass(
    class {
      constructor() {}
      update(up: View.ViewUpdate) {
        let view = up.view;
        if (!up.selectionSet) return;
        let sel = up.state.selection.main;
        view.requestMeasure<{ cursor: View.Rect | null; scroller: DOMRect }>({
          read() {
            return {
              scroller: view.scrollDOM.getBoundingClientRect(),
              cursor: view.coordsAtPos(sel.anchor),
            };
          },
          write({ cursor, scroller }) {
            if (cursor == null) return;
            let diff = scroller.bottom - cursor.bottom;
            if (diff < 150) view.scrollDOM.scrollTop += 150 - diff;
          },
        });
      }
    },
  );

  // Query

  let cells = (state: State.EditorState) => state.field(cellsField);
  let prevCells = (state: State.EditorState) => state.field(prevCellsField);
  let currentCell = (state: State.EditorState) =>
    state.facet(currentCellField)[0]!;
  function* allCells(state: State.EditorState) {
    for (let cell of state.field(cellsField)) yield cell;
    for (let cell of state.field(prevCellsField)) yield cell;
  }

  let query = {
    cells,
    prevCells,
    allCells,
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
      resultPreview: currentCell.result?.isResolved
        ? currentCell.result.value
        : null,
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
    for (let cell of query.allCells(view.state)) {
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
    for (let cell of query.allCells(view.state)) {
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

  let focusCurrentCell: View.Command = (view: View.EditorView) => {
    let currentCell = query.currentCell(view.state);
    if (!view.hasFocus) view.focus();
    view.dispatch({
      selection: State.EditorSelection.cursor(currentCell.to),
      scrollIntoView: true,
    });
    return true;
  };

  let commands = { addCell, reuseCell, selectCell, focusCurrentCell };

  let toWorkspace0 = (state: State.EditorState): Workspace0.Workspace0 => {
    let toWorkspaceCell0 = (
      cell: WorkspaceCell,
    ): Workspace0.WorkspaceCell0 => ({
      from: cell.from,
      to: cell.to,
      result: cell.result?.isResolved ? cell.result.value : null,
    });
    return {
      doc: state.doc.sliceString(0),
      prevSessions: workspace0.prevSessions,
      currentSession: {
        createdAt: workspace0.currentSession.createdAt,
        cells: cells(state).map(toWorkspaceCell0),
      },
      currentCell: toWorkspaceCell0(currentCell(state)),
    };
  };

  let extension = [
    onInit.extension,
    onSelection.extension,
    computeCurrentCellField,
    prevCellsField,
    cellsField,
    prevOutputWidgets,
    outputWidgets,
    preview,
    placeholder,
    sessionBanner,
    ignoreCellEdits,
  ];
  if (config instanceof State.StateField) extension.push(config);

  let workspace = {
    query,
    commands,
    toWorkspace0,
    extension,
  };

  return workspace;
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

function renderResult(
  root: HTMLDivElement,
  result: REPL.REPLResult,
  preview: boolean = false,
) {
  root.classList.remove(...root.classList.values());
  root.classList.add("Output");
  if (preview) root.classList.add("Output--preview");
  if (result.type === "ok") {
    root.innerText = result.ok ?? "";
  } else if (result.type === "error") {
    root.innerText = result.error;
    root.classList.add("Output--error");
  } else if (result.type === "notice") {
    root.innerText = result.notice;
    root.classList.add("Output--notice");
  }
}

class CellOutputWidget extends View.WidgetType {
  private mounted: boolean = true;

  constructor(
    private readonly cell: WorkspaceCell,
    private readonly fetch: boolean = false,
  ) {
    super();
  }

  toDOM() {
    let root = document.createElement("div");
    let result = this.cell.result?.isCompleted
      ? this.cell.result.value
      : this.cell.resultPreview;
    if (result != null) {
      renderResult(root, result);
    } else {
      renderResult(root, { type: "notice", notice: "..." });
    }
    if (
      this.fetch &&
      this.cell.result != null &&
      !this.cell.result.isCompleted
    ) {
      this.cell.result.then((result) => {
        if (this.mounted) renderResult(root, result);
      });
    }
    return root;
  }

  override destroy(_dom: HTMLElement) {
    this.mounted = false;
  }

  override eq(other: CellOutputWidget) {
    return other.cell === this.cell;
  }
}

class PreviewOutputWidget extends View.WidgetType {
  private mounted: boolean = true;
  private timer: NodeJS.Timer | null = null;
  private prevCode: string | null = null;
  private root: HTMLDivElement | null = null;

  constructor(
    public cell: WorkspaceCell,
    public code: string,
    readonly repl: REPL.IREPL,
  ) {
    super();
  }

  toDOM() {
    this.root = document.createElement("div");
    let result = this.cell.result?.isCompleted
      ? this.cell.result.value
      : this.cell.resultPreview;
    if (result != null) renderResult(this.root, result, true);
    if (!this.cell.result?.isCompleted)
      this.schedulePreview(this.cell, this.code);
    return this.root;
  }

  override updateDOM(_dom: HTMLElement): boolean {
    if (!this.cell.result?.isCompleted)
      this.schedulePreview(this.cell, this.code);
    return true;
  }

  schedulePreview(cell: WorkspaceCell, code: string) {
    this.prevCode = code;
    if (code.trim() === "")
      renderResult(this.root!, { type: "notice", notice: "" }, true);
    if (this.timer != null) clearTimeout(this.timer);
    let timer = setTimeout(() => {
      this.repl.preview(code).then(cell.result!.resolve, cell.result!.reject);
      cell.result!.then((result) => {
        if (this.mounted && timer === this.timer) {
          renderResult(this.root!, result, true);
        }
      });
    }, 400);
    this.timer = timer;
  }

  override eq(other: PreviewOutputWidget) {
    return other.code === this.prevCode;
  }

  override destroy(_dom: HTMLElement) {
    this.mounted = false;
    if (this.timer != null) clearTimeout(this.timer);
  }
}

class LineWidget extends View.WidgetType {
  constructor(private readonly startTime: number) {
    super();
  }
  toDOM() {
    let root = document.createElement("div");
    root.classList.add("SessionBanner");
    let date = new Intl.DateTimeFormat(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(this.startTime);
    root.innerText = `STARTED ${date}`;
    return root;
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
