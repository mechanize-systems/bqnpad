/// <reference types="react-dom/next" />
/// <reference types="react/next" />
import * as Autocomplete from "@codemirror/autocomplete";
import * as CloseBrackets from "@codemirror/closebrackets";
import * as Commands from "@codemirror/commands";
import * as History from "@codemirror/history";
import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as LangBQN from "lang-bqn";
import * as React from "react";

import * as REPL from "@bqnpad/repl";
import * as Base from "@mechanize/base";
import * as Editor from "@mechanize/editor";
import * as UI from "@mechanize/ui";

import { AppHeader } from "./AppHeader";
import { FontSelect } from "./FontSelect";
import { SessionBanner } from "./SessionBanner";
import { ThemeSelect } from "./ThemeSelect";
import * as Workspace0 from "./Workspace0";
import type { WorkspaceManager } from "./WorkspaceManager";

export type WorkspaceProps = {
  manager: WorkspaceManager;
  disableSessionControls?: boolean;
  disableSessionBanner?: boolean;
};

export function Workspace({
  manager,
  disableSessionControls,
  disableSessionBanner = false,
}: WorkspaceProps) {
  let workspace0 = manager.load().getOrSuspend();
  let doc0 = React.useMemo(
    () => State.Text.of(workspace0.doc.split("\n")),
    [workspace0],
  );
  let editor = React.useRef<null | View.EditorView>(null);

  let [vm, setVm_] = Base.React.usePersistentState<REPL.REPLType>(
    "bqnpad-vm",
    () => "bqnjs",
  );
  let setVm = (newVm: typeof vm) => {
    let state = editor.current!.state;
    manager.store((_) => workspace.toWorkspace0(state));
    setVm_(newVm);
    manager.restart();
  };

  let [enableLivePreview, setEnableLivePreview] =
    Base.React.usePersistentState<boolean | null>(
      "bqnpad-pref-enableLivePreview",
      () => Base.Worker.supportsWorkerModule(),
    );
  let enableLivePreviewTitle;
  if (vm === "cbqn") {
    // CBQN does not support live preview yet
    enableLivePreview = null;
    enableLivePreviewTitle =
      "Live Preview is not support while using CBQN VM yet";
  }

  let config = Editor.useStateField<WorkspaceConfig>(
    editor,
    {
      enableLivePreview: enableLivePreview ?? false,
      disableSessionBanner,
    },
    [enableLivePreview, disableSessionBanner],
  );

  let repl = REPL.useREPL(vm);

  let listSys = React.useMemo(() => {
    let sys: null | Promise<REPL.ValueDesc[]> = null;
    return () => {
      if (sys == null) sys = repl.listSys();
      return sys;
    };
  }, [repl]);

  let [{ status }, workspace] = useWorkspace(repl, workspace0, editor, config);

  let [onUpdate, _onUpdateFlush, onUpdateCancel] =
    Base.React.useDebouncedCallback(
      1000,
      (update: View.ViewUpdate) => {
        manager.store((_) => workspace.toWorkspace0(update.state));
      },
      [manager, workspace],
    );

  let [theme, themePref, setThemePref] = UI.useTheme();
  let darkThemeExtension = Editor.useStateField(editor, theme === "dark", [
    theme,
  ]);

  let keybindings: View.KeyBinding[] = React.useMemo<View.KeyBinding[]>(() => {
    return [
      { key: "Mod-a", run: workspace.commands.selectCell },
      { key: "Shift-Enter", run: workspace.commands.addCell },
      { key: "Enter", run: workspace.commands.reuseCell },
      { key: "Tab", run: Autocomplete.startCompletion },
      ...CloseBrackets.closeBracketsKeymap,
    ];
  }, [workspace]);

  let extensions = React.useMemo(
    () => [
      History.history(),
      workspace.extension,
      View.keymap.of(keybindings),
      View.keymap.of(History.historyKeymap),
      View.keymap.of(Commands.defaultKeymap),
      LangBQN.bqn({ sysCompletion: listSys }),
      Language.indentOnInput(),
      darkThemeExtension,
      View.EditorView.darkTheme.from(darkThemeExtension),
      CloseBrackets.closeBrackets(),
      Editor.scrollMarginBottom(150),
    ],
    [listSys, workspace, darkThemeExtension, keybindings],
  );

  let onGlyph = React.useCallback(
    (glyph: LangBQN.Glyph) => {
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
    onUpdateCancel();
    manager.store((_) => newW);
    manager.restart();
  }, [editor, manager, onUpdateCancel, workspace]);

  let editorElement = React.useRef<null | HTMLDivElement>(null);
  Editor.useEditor(editorElement, editor, {
    doc: doc0,
    onUpdate,
    extensions,
  });
  React.useLayoutEffect(() => {
    workspace.commands.focusCurrentCell(editor.current!);
  }, [editor, workspace]);

  let statusElement = status != null && (
    <div className="Toolbar__section">
      <div
        className={UI.cx(
          "VMStatus",
          status === "idle" && "VMStatus--idle",
          status === "running" && "VMStatus--running",
        )}
      >
        VM {status.toUpperCase()}
      </div>
    </div>
  );

  let settings = (
    <>
      <ThemeSelect themePref={themePref} onThemePref={setThemePref} />
      <FontSelect />
    </>
  );

  let settingsRight = (
    <>
      <UI.Checkbox
        disabled={enableLivePreview === null}
        value={enableLivePreview ?? false}
        onValue={setEnableLivePreview}
        title={enableLivePreviewTitle}
      >
        Live preview
      </UI.Checkbox>
    </>
  );

  let toolbar = (
    <>
      <div className="Toolbar" style={{ justifyContent: "flex-start" }}>
        <div className="Toolbar__section">
          <div className="label">Session:</div>
          {!disableSessionControls && (
            <UI.Button title="Create new session" onClick={() => onNew()}>
              New
            </UI.Button>
          )}
          <UI.Button
            title="Restart current session"
            onClick={() => manager.restart()}
          >
            Restart
          </UI.Button>
          <UI.Button
            title="Download workspace as .bqn source file"
            onClick={onSave}
          >
            Download
          </UI.Button>
        </div>
        <div className="Toolbar__section">
          <div className="label">VM:</div>
          <UI.Select
            value={vm}
            onValue={setVm}
            options={[
              { label: "BQN.js", value: "bqnjs" },
              { label: "CBQN", value: "cbqn" },
            ]}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="Workspace">
      <AppHeader
        status={statusElement}
        toolbar={toolbar}
        settings={settings}
        settingsRight={settingsRight}
        theme={theme}
      />
      <div ref={editorElement} className="Editor" />
    </div>
  );
}

function useWorkspace(
  repl: REPL.IREPL,
  workspace0: Workspace0.Workspace0 = Workspace0.empty,
  editor: { current: View.EditorView | null },
  config: WorkspaceConfig | State.StateField<WorkspaceConfig>,
): readonly [WorkspaceState, Workspace] {
  let w = React.useMemo(
    () => workspace(repl, workspace0, editor, config),
    [repl, workspace0, editor, config],
  );
  let status = REPL.useREPLStatus(repl);
  return [{ status }, w] as const;
}

type WorkspaceConfig = {
  enableLivePreview: boolean;
  disableSessionBanner: boolean;
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
  result: null | Base.Promise.Deferred<readonly [REPL.REPLResult, string[]]>;
  resultPreview: null | readonly [REPL.REPLResult, string[]];
};

type WorkspaceState = {
  readonly status: REPL.REPLStatus | null;
};

function workspace(
  repl: REPL.IREPL,
  workspace0: Workspace0.Workspace0 = Workspace0.empty,
  editor: { current: View.EditorView | null },
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

  let fromWorkspaceCell0 = (
    cell: Workspace0.WorkspaceCell0,
    idx: number,
  ): WorkspaceCell => {
    let resultPreview: WorkspaceCell["resultPreview"] =
      cell.result != null && !Array.isArray(cell.result)
        ? ([cell.result as REPL.REPLResult, [] as string[]] as const)
        : (cell.result as null | readonly [REPL.REPLResult, string[]]);
    return {
      idx,
      from: cell.from,
      to: cell.to,
      result: null,
      resultPreview,
    };
  };

  let prevCellsField = State.StateField.define<WorkspaceCell[]>({
    create() {
      return workspace0.prevSessions.flatMap((session) =>
        session.cells.map(fromWorkspaceCell0),
      );
    },
    update(state) {
      return state;
    },
  });

  let addCellEffect = State.StateEffect.define<WorkspaceCell>();
  let cellsField = State.StateField.define<WorkspaceCell[]>({
    create() {
      return workspace0.currentSession.cells.map(fromWorkspaceCell0);
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
        result: Base.Promise.deferred(),
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
            let widget = new CellOutputWidget(cell);
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
            let widget = new CellOutputWidget(cell);
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

  let sessionBanner = View.EditorView.decorations.compute(
    [config],
    (state) => {
      let { disableSessionBanner } = state.field(config);
      if (disableSessionBanner) return View.Decoration.none;

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
          widget: new SessionBanner(
            session,
            getWorkspace,
            session === workspace0.currentSession,
          ),
          block: true,
          side: -1,
        });
        ranges.push(deco.range(from));
      };

      for (let session of workspace0.prevSessions) add(session);
      add(workspace0.currentSession, workspace0.currentCell.from);

      return View.Decoration.set(ranges);
    },
  );

  let getWorkspace = () => {
    return toWorkspace0(editor.current!.state);
  };

  let preview = View.EditorView.decorations.compute(
    ["doc", currentCellField, config],
    (state) => {
      let { enableLivePreview } = state.field(config);
      if (!enableLivePreview) return View.Decoration.none;
      let cell = state.facet(currentCellField)[0]!;
      let code = state.doc.sliceString(cell.from, cell.to);
      let deco = View.Decoration.widget({
        widget: new PreviewOutputWidget(cell, code, repl),
        block: true,
        side: 1,
      });
      return View.Decoration.set([deco.range(cell.to)]);
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
            cell.result = Base.Promise.deferred();
            repl.eval(code).then(cell.result.resolve, cell.result.reject);
          }
        }
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
      result: Base.Promise.deferred(),
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

  override get estimatedHeight() {
    return LINE_HEIGHT;
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

function resultContent([result, logs]: readonly [
  REPL.REPLResult,
  string[],
]): readonly [string, string] {
  let output: string;
  if (result.type === "ok") {
    output = result.ok ?? "";
  } else if (result.type === "notice") {
    output = result.notice;
  } else {
    output = "";
  }
  return [output.trim(), logs.join("\n").trim()] as const;
}

class FoldedOutputView {
  _content: string;
  _numberOfLines: null | number = null;
  _folded: boolean | null;
  _root: HTMLElement | null = null;
  onRender: null | ((root: HTMLElement) => void) = null;
  constructor(
    content: string,
    public readonly foldCutoffLines: number,
    folded: boolean | null = null,
  ) {
    this._content = content;
    this._folded = folded;
  }

  get root() {
    if (this._root == null) this._root = document.createElement("div");
    return this._root;
  }

  get content() {
    return this._content!;
  }

  set content(content: string) {
    this._content = content;
    this._numberOfLines = null;
  }

  get estimatedHeight(): number {
    if (this.folded) {
      return this.foldCutoffLines * LINE_HEIGHT;
    } else {
      return this.numberOfLines * LINE_HEIGHT;
    }
  }

  get numberOfLines(): number {
    if (this.content === "") return 0;
    if (this._numberOfLines == null)
      this._numberOfLines = this.content.split("\n").length;
    return this._numberOfLines;
  }

  get needFold(): boolean {
    return this.numberOfLines > this.foldCutoffLines;
  }

  get folded(): boolean {
    if (this._folded != null) return this._folded;
    return this.needFold;
  }

  toDOM(): HTMLElement {
    this.render();
    return this._root!;
  }

  render() {
    let root;
    if (this._root == null) {
      this._root = document.createElement("div");
      root = this._root;
    } else {
      root = this._root!;
      while (root.lastChild) root.removeChild(root.lastChild);
    }
    this._root.classList.add("FoldedOutput");
    root.style.height = `${this.estimatedHeight}px`;

    // button
    let button = document.createElement("button");
    button.classList.add("Button");
    button.classList.add("FoldedOutput__button");
    if (!this.needFold || this.content === "")
      button.classList.add("FoldedOutput__button--disabled");
    button.title = "Output is too long (fold/unfold)";
    button.textContent = "⇅";
    button.onclick = () => {
      this._folded = this._folded == null ? false : !this._folded;
      this.render();
    };

    // output
    let output = document.createElement("div");
    output.classList.add("FoldedOutput__output");
    let content = this.content;
    if (this.folded) {
      content = content
        .split("\n")
        .slice(0, this.foldCutoffLines - 1)
        .join("\n");
      if (content !== "") content += "\n";
      content = content + "…";
    }
    output.textContent = content;

    root.appendChild(output);
    root.appendChild(button);

    if (this.onRender) this.onRender(root);
  }
}

abstract class BaseOutputWidget extends View.WidgetType {
  private _result: readonly [REPL.REPLResult, string[]] | null = null;
  private _resultContent: readonly [string, string] | null = null;
  private _numberOfLines: number | null = null;

  onResultUpdate(): void {}

  get result() {
    return this._result!;
  }

  set result(result) {
    this._result = result;
    this._numberOfLines = null;
    this._resultContent = null;
    this.onResultUpdate();
  }

  get resultContent(): readonly [string, string] {
    if (this._resultContent == null) {
      if (this._result == null) return ["", ""];
      this._resultContent = resultContent(this._result!);
    }
    return this._resultContent;
  }

  get numberOfLines(): number {
    // TODO: consider storing this inside workspace?
    if (this._numberOfLines == null) {
      let [p1, p2] = this.resultContent;
      this._numberOfLines = p1.split("\n").length + p2.split("\n").length;
    }
    return this._numberOfLines;
  }
}

class CellOutputWidget extends BaseOutputWidget {
  private mounted: boolean = true;
  private root: HTMLDivElement | null = null;
  private logsView: FoldedOutputView;
  private outputView: FoldedOutputView;

  constructor(private readonly cell: WorkspaceCell) {
    super();
    this.logsView = new FoldedOutputView("", 1);
    this.outputView = new FoldedOutputView("", 10);
    this.result = this.cell.result?.isCompleted
      ? this.cell.result.value
      : this.cell.resultPreview != null
      ? this.cell.resultPreview
      : [{ type: "notice", notice: "..." }, [] as string[]];
  }

  override onResultUpdate(): void {
    this.outputView.content = this.resultContent[0];
    this.logsView.content = this.resultContent[1];
  }

  override get estimatedHeight() {
    return this.outputView.estimatedHeight + this.logsView.estimatedHeight;
  }

  render() {
    if (this.root == null) {
      this.root = document.createElement("div");
      this.root.classList.add("Output");
    }

    this.outputView.onRender = (root) => {
      if (this.result[0].type === "error") {
        root.classList.add("FoldedOutput--error");
      } else if (this.result[0].type === "notice") {
        root.classList.add("FoldedOutput--notice");
      }
    };
    this.logsView.render();
    this.outputView.render();
  }

  toDOM() {
    this.result = this.cell.result?.isCompleted
      ? this.cell.result.value
      : this.cell.resultPreview != null
      ? this.cell.resultPreview
      : [{ type: "notice", notice: "..." }, []];
    this.render();
    this.root!.appendChild(this.logsView.root);
    this.root!.appendChild(this.outputView.root);
    if (this.cell.result && !this.cell.result.isCompleted) {
      this.cell.result.then((result) => {
        if (this.mounted) {
          this.result = result;
          this.render();
        }
      });
    }
    return this.root!;
  }

  override destroy(_dom: HTMLElement) {
    this.mounted = false;
    this.root = null;
  }

  override eq(other: CellOutputWidget) {
    return other.cell === this.cell;
  }
}

class PreviewOutputWidget extends BaseOutputWidget {
  private mounted: boolean = true;
  private timer: NodeJS.Timer | null = null;
  private root: HTMLDivElement | null = null;
  private logsView: FoldedOutputView;
  private outputView: FoldedOutputView;

  constructor(
    public cell: WorkspaceCell,
    public code: string,
    readonly repl: REPL.IREPL,
  ) {
    super();
    this.logsView = new FoldedOutputView("", 1, false);
    this.outputView = new FoldedOutputView("", Infinity);
    this.result = this.cell.result?.isCompleted
      ? this.cell.result.value
      : this.cell.resultPreview
      ? this.cell.resultPreview
      : [{ type: "notice", notice: "..." }, []];
  }

  override onResultUpdate(): void {
    this.outputView.content =
      this.resultContent[0] === "Error: Empty program"
        ? ""
        : this.resultContent[0];
    this.logsView.content = this.resultContent[1];
  }

  override get estimatedHeight() {
    return this.numberOfLines * LINE_HEIGHT;
  }

  render() {
    this.logsView.render();
    this.outputView.render();
  }

  schedule() {
    if (this.cell.result?.isCompleted) return;
    if (this.code.trim() === "") {
      this.result = [{ type: "notice", notice: "" }, []];
      this.render();
      return;
    }

    this.result = [{ type: "notice", notice: "..." }, []];
    this.render();

    if (this.timer != null) clearTimeout(this.timer);
    let timer = setTimeout(() => {
      if (this.timer !== timer) return;
      this.repl
        .preview(this.code)
        .then(this.cell.result!.resolve, this.cell.result!.reject);
      this.cell.result!.then((result) => {
        if (this.mounted && this.timer === timer) {
          this.result = result;
          this.render();
        }
      });
    }, 400);
    this.timer = timer;
  }

  toDOM() {
    this.root = document.createElement("div");
    this.root.classList.add("Output");
    this.render();
    this.root.appendChild(this.logsView.root);
    this.root.appendChild(this.outputView.root);
    this.schedule();
    return this.root;
  }

  override eq(other: PreviewOutputWidget) {
    return other.code === this.code;
  }

  override destroy(_dom: HTMLElement) {
    this.mounted = false;
    this.root = null;
    if (this.timer != null) clearTimeout(this.timer);
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

// TODO: need to infer this from CSS
// line-height (1.4) * fontSize (20)
const LINE_HEIGHT = 28;
