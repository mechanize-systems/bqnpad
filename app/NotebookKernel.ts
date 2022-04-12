import * as State from "@codemirror/state";
import * as View from "@codemirror/view";

import * as REPL from "@bqnpad/repl";
import * as Base from "@mechanize/base";
import * as Editor from "@mechanize/editor";

/** Cell type. */

export type CellData = {
  id: number;
  prevDeferred: CellResultDeferred | null;
  deferred: CellResultDeferred;
};

export type CellState = "ok" | "dirty" | "computing";
export type CellResult = readonly [REPL.REPLResult, string[]];
export type CellResultDeferred = Base.Promise.Deferred<CellResult>;

export type Cell = Editor.Cells.Cell<CellData>;

/** Instantiate cells extension. */

let cellId = 0;
let onCellCreate = (): CellData => ({
  id: cellId++,
  prevDeferred: null,
  deferred: Base.Promise.deferred(),
});

export let cells = Editor.Cells.configure<CellData>({
  onCellCreate,
});

/** Notebook extension. */
export function configure() {
  let [view, viewExtension] = Editor.viewRef();

  let outputDecoration = Editor.Cells.cellsWidgetDecoration(
    cells,
    (builder, cellRange, state) => {
      builder.add(
        cellRange.to,
        cellRange.to,
        View.Decoration.widget({
          widget: new OutputWidget(
            view,
            NotebookREPL.get(state),
            cellRange.value,
          ),
          block: true,
          side: 1,
        }),
      );
    },
  );

  let cellDecoration = Editor.Cells.cellsLineDecoration(
    cells,
    (cell: Editor.Cells.Cell, state: State.EditorState) => {
      let s = NotebookREPL.get(state).state(cell);
      return {
        attributes: {
          class: "CellLine",
          style: `--cell-status-color: ${cellStatusColor(s)}`,
        },
      };
    },
  );

  let focusedCellDecoration = Editor.Cells.cellsFocusDecoration(cells, {
    attributes: {
      class: "CellLine--active",
    },
  });

  return {
    extension: [
      NotebookREPL,
      viewExtension,
      cells.extension,
      outputDecoration,
      cellDecoration,
      focusedCellDecoration,
    ] as State.Extension,
  };
}

/** Run till the specificed cell (current cell is used by default). */
let run =
  (cell: Editor.Cells.Cell<CellData>): View.Command =>
  (view) => {
    let repl = NotebookREPL.get(view.state);

    let toRun: {
      from: number;
      to: number;
      cell: Editor.Cells.Cell<CellData>;
    }[] = [];
    let cs = cells.query.cells(view.state);
    for (let it = cs.iter(); it.value != null; it.next()) {
      toRun.push({ from: it.from, to: it.to, cell: it.value });
      if (it.value === cell) break;
    }
    run();
    return true;

    // TODO: O(n)!
    function getById(id: number) {
      let cs = cells.query.cells(view.state);
      for (let it = cs.iter(); it.value != null; it.next())
        if (it.value.data.id === id) return it.value;
      return null;
    }

    async function run() {
      for (let { from, to, cell } of toRun) {
        let state = repl.state(cell);
        if (state === "computing") await cell.data.deferred;
        else if (state === "ok") continue;
        else if (state === "dirty") {
          let code = view.state.doc.sliceString(from, to).trim();
          let deferred =
            cell.data.prevDeferred == null
              ? cell.data.deferred
              : Base.Promise.deferred<readonly [REPL.REPLResult, string[]]>();
          let newCell: CellData = {
            id: cell.data.id,
            prevDeferred: cell.data.deferred,
            deferred,
          };
          view.dispatch({
            effects: [
              cells.effects.updateCells.of(new Map([[cell.data, newCell]])),
            ],
            annotations: [State.Transaction.addToHistory.of(false)],
          });
          repl.eval(cell, code).then(deferred.resolve, deferred.reject);

          let result = await deferred.promise;
          let curCell = getById(newCell.id);
          if (curCell != null && curCell.version === cell.version) {
            view.dispatch({
              effects: [
                cells.effects.updateCells.of(
                  new Map([[curCell.data, { ...curCell.data }]]),
                ),
              ],
              annotations: [State.Transaction.addToHistory.of(false)],
            });
            if (result[0].type !== "ok") break;
          } else break;
        } else Base.never(state);
      }
    }
  };

/** Run till the current cell (inclusive). */
let runCurrent: View.Command = (view) => {
  let cell = cells.query.cellAt(view.state)!.value;
  return run(cell)(view);
};

/** Run entire notebook. */
let runAll: View.Command = (view) => {
  let c = cells.query.cellAt(view.state, view.state.doc.length)!.value;
  return run(c)(view);
};

/** Run till the current cell and insert a new cell. */
let runCurrentAndInsertCellAfter: View.Command = (view) => {
  return runCurrent(view) && cells.commands.insertAfter(view);
};

class OutputWidget extends View.WidgetType {
  _estimatedHeight: number = -1;
  textContent: string = "";
  className: string = "CellOutput";
  mounted: boolean = false;

  constructor(
    private readonly view: { current: View.EditorView | null },
    private readonly repl: NotebookREPL,
    private readonly cell: Editor.Cells.Cell<CellData>,
  ) {
    super();
    let { deferred, prevDeferred } = this.cell.data;
    if (deferred.isCompleted) this.onResult(deferred.value[0]);
    else {
      if (prevDeferred?.isCompleted) this.onResult(prevDeferred.value[0]);
      deferred.then(([res]) => this.onResult(res));
    }
  }

  onResult = (result: REPL.REPLResult) => {
    let [textContent, className] = renderResult(result);
    let lines =
      textContent === "" ? 0 : (textContent.match(/\n/g) ?? []).length + 1;
    let prevEstimatedHeight = this.estimatedHeight;
    this.estimatedHeight = 28 * lines;
    this.textContent = textContent;
    this.className = className;
    if (this.mounted && prevEstimatedHeight !== this.estimatedHeight)
      this.view.current!.requestMeasure();
  };

  get cellState(): CellState {
    return this.repl.state(this.cell);
  }

  override get estimatedHeight(): number {
    return this._estimatedHeight;
  }

  override set estimatedHeight(value: number) {
    this._estimatedHeight = value;
  }

  override destroy(_dom: HTMLElement): void {
    this.mounted = false;
  }

  render(root: HTMLElement, output: HTMLElement, force: boolean) {
    this.mounted = true;
    root.dataset["cellId"] = String(this.cell.data.id);
    root.dataset["cellVersion"] = String(this.cell.version);

    root.style.setProperty(
      "--cell-status-color",
      cellStatusColor(this.cellState, "transparent"),
    );
    root.style.setProperty(
      "--cell-status-marker-color",
      cellStatusColor(this.cellState, "var(--app-border-ui)"),
    );

    if (this.cellState === "dirty" || this.cellState === "computing") {
      output.style.opacity = "0.3";
    } else {
      output.style.opacity = "1.0";
    }
    root.classList.add("CellOutput");
    let render = (res: REPL.REPLResult) => {
      this.onResult(res);
      root.className = this.className;
      root.style.height = `${this.estimatedHeight}px`;
      output.textContent = this.textContent;
    };
    let renderFallback = () => {
      if (this.cell.data.prevDeferred?.isCompleted) {
        root.className = this.className;
        root.style.height = `${this.estimatedHeight}px`;
        output.textContent = this.textContent;
      }
    };
    if (this.cell.data.deferred.isCompleted) {
      if (this.isValid(root) || force)
        render(this.cell.data.deferred.value[0]);
      else renderFallback();
    } else {
      renderFallback();
      this.cell.data.deferred.then((result) => {
        if (this.isValid(root)) render(result[0]);
      });
    }
  }

  isValid(root: HTMLElement) {
    return (
      root.dataset["cellId"] === String(this.cell.data.id) &&
      root.dataset["cellVersion"] === String(this.cell.version) &&
      this.repl.isComputed(this.cell)
    );
  }

  override eq(widget: OutputWidget): boolean {
    return this.cell === widget.cell && this.cellState === widget.cellState;
  }

  override updateDOM(root: HTMLElement): boolean {
    let canUpdate = root.dataset["cellId"] === String(this.cell.data.id);
    if (!canUpdate) return false;
    this.render(
      root as HTMLDivElement,
      root.querySelector(".CellOutput__output") as HTMLDivElement,
      true,
    );
    return true;
  }

  override toDOM() {
    let root = document.createElement("div");
    let output = document.createElement("div");
    output.classList.add("CellOutput__output");
    root.appendChild(output);
    this.render(root, output, true);
    return root;
  }
}

function cellStatusColor(state: CellState, fallback: string = "transparent") {
  return state === "ok"
    ? fallback
    : state === "dirty"
    ? "var(--app-border-warn-ui)"
    : state === "computing"
    ? "var(--app-border-warn-ui)"
    : Base.never(state);
}

function renderResult(res: REPL.REPLResult) {
  if (res.type === "ok") {
    return [res.ok ?? "", "CellOutput CellOutput--ok"] as const;
  } else if (res.type === "error") {
    return [res.error, "CellOutput CellOutput--error"] as const;
  } else if (res.type === "notice") {
    return [res.notice, "CellOutput CellOutput--ok"] as const;
  } else Base.never(res);
}

class NotebookREPL {
  private repl: REPL.IREPL;
  private versions: Map<number, number> = new Map();
  constructor(replType: REPL.REPLType) {
    this.repl = REPL.makeREPL(replType);
  }

  eval(cell: Cell, code: string) {
    this.versions.set(cell.data.id, cell.version);
    return this.repl.eval(code);
  }

  isComputed(cell: Cell) {
    return cell.version === this.versions.get(cell.data.id) ?? -1;
  }

  state(cell: Editor.Cells.Cell<CellData>): CellState {
    if (cell.data.prevDeferred == null || !this.isComputed(cell))
      return "dirty";
    if (!cell.data.deferred.isCompleted) return "computing";
    return "ok";
  }

  static get(state: State.EditorState) {
    return state.field(this.extension);
  }

  static extension = State.StateField.define<NotebookREPL>({
    create() {
      return new NotebookREPL("bqnjs");
    },
    update(repl) {
      return repl;
    },
  });
}

export let keymap = [
  { key: "Mod-a", run: cells.commands.select },
  { key: "Meta-Enter", run: cells.commands.insertAfter },
  { key: "Shift-Enter", run: runCurrent },
  { key: "Alt-Shift-Enter", run: runAll },
  { key: "Meta-Alt-Enter", run: cells.commands.split },
  { key: "Meta-Shift-Enter", run: runCurrentAndInsertCellAfter },
  { key: "Meta-Backspace", run: cells.commands.joinWithPrevious },
  { key: "Backspace", run: cells.commands.removeIfEmpty },
];

export let commands = {
  ...cells.commands,
  runAll,
  runCurrent,
  runCurrentAndInsertCellAfter,
};

export function decode(
  notebook: string,
): readonly [State.Text, Editor.Cells.CellSet<CellData>] {
  let builder = new Editor.Cells.DocBuilder<CellData>();
  let lines: string[] = [];
  for (let line of notebook.split("\n"))
    if (line === "###") {
      let code = lines.join("\n");
      lines = [];
      builder.add(code, new Editor.Cells.Cell(onCellCreate(), -1));
    } else lines.push(line);
  if (lines.length > 0) {
    let code = lines.join("\n");
    builder.add(code, new Editor.Cells.Cell(onCellCreate(), -1));
  }
  return builder.finish();
}

export function encode(state: State.EditorState) {
  let cs = cells.query.cells(state);
  let chunks = [];
  for (let it = cs.iter(); it.value != null; it.next()) {
    chunks.push(state.doc.sliceString(it.from, it.to));
    chunks.push("###");
  }
  return chunks.join("\n");
}
