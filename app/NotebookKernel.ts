import * as State from "@codemirror/state";
import * as View from "@codemirror/view";

import * as REPL from "@bqnpad/repl";
import * as Base from "@mechanize/base";
import * as Editor from "@mechanize/editor";

export type CellData = {
  readonly id: number;
  readonly deferred: null | Base.Promise.Deferred<
    readonly [REPL.REPLResult, string[]]
  >;
};

export type CellState = "ok" | "dirty" | "computing";

export type Cell = Editor.Cells.Cell<CellData>;

export type NotebookConfig = {
  notebook?: string;
  onNotebook?: (getNotebook: () => string) => void;
  replType?: REPL.REPLType;
};

export function configure({
  notebook = "",
  onNotebook,
  replType = "bqnjs",
}: NotebookConfig = {}) {
  let [doc, cellSet] = decode(notebook);
  let repl = new NotebookREPL(replType);
  let cells = Editor.Cells.configure<CellData>({
    cellSet,
    onCellCreate,
  });

  let runCell: View.Command = (view) => {
    let cur = cells.query.cellAt(view.state)!;

    let toRun: {
      from: number;
      to: number;
      cell: Editor.Cells.Cell<CellData>;
    }[] = [];
    let cs = cells.query.cells(view.state);
    for (let it = cs.iter(); it.value != null; it.next()) {
      toRun.push({ from: it.from, to: it.to, cell: it.value });
      if (it.value === cur.value) break;
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
            Base.Promise.deferred<readonly [REPL.REPLResult, string[]]>();

          let newCell = { ...cell.data, deferred, version: cell.version };
          view.dispatch({
            effects: [
              cells.effects.updateCells.of(new Map([[cell.data, newCell]])),
            ],
            annotations: [State.Transaction.addToHistory.of(false)],
          });
          repl.eval(cell, code).then(deferred.resolve, deferred.reject);

          let result = await deferred.promise;
          let curCell = getById(newCell.id);
          if (curCell != null && curCell.version === newCell.version) {
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

  let runCellAndInsertAfter: View.Command = (view) => {
    return runCell(view) && cells.commands.insertAfter(view);
  };

  let keymap = [
    { key: "Mod-a", run: cells.commands.select },
    { key: "Meta-Enter", run: cells.commands.insertAfter },
    { key: "Shift-Enter", run: runCell },
    { key: "Meta-Alt-Enter", run: cells.commands.split },
    { key: "Meta-Shift-Enter", run: runCellAndInsertAfter },
    { key: "Meta-Backspace", run: cells.commands.mergeWithPrevious },
    { key: "Backspace", run: cells.commands.removeIfEmpty },
  ];

  let outputDecoration = Editor.Cells.cellsWidgetDecoration(
    cells,
    (builder, cellRange) => {
      builder.add(
        cellRange.to,
        cellRange.to,
        View.Decoration.widget({
          widget: new OutputWidget(repl, cellRange.value),
          block: true,
          side: 1,
        }),
      );
    },
  );

  let cellDecoration = Editor.Cells.cellsLineDecoration(
    cells,
    (cell: Editor.Cells.Cell) => {
      let state = repl.state(cell);
      return {
        attributes: {
          class: "CellLine",
          style: `--cell-status-color: ${cellStatusColor(state)}`,
        },
      };
    },
  );

  let focusedCellDecoration = Editor.Cells.cellsFocusDecoration(cells, {
    attributes: {
      class: "CellLine--active",
    },
  });

  function decode(notebook: string) {
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

  function encode(state: State.EditorState) {
    let cs = cells.query.cells(state);
    let chunks = [];
    for (let it = cs.iter(); it.value != null; it.next()) {
      chunks.push(state.doc.sliceString(it.from, it.to));
      chunks.push("###");
    }
    return chunks.join("\n");
  }

  let onUpdate = View.EditorView.updateListener.of((update) => {
    onNotebook?.(() => encode(update.state));
  });

  return {
    repl,
    doc,
    keymap,
    extension: [
      cells.extension,
      outputDecoration,
      cellDecoration,
      focusedCellDecoration,
      onUpdate,
    ] as State.Extension,
  };
}

class OutputWidget extends View.WidgetType {
  constructor(
    private readonly repl: NotebookREPL,
    private readonly cell: Editor.Cells.Cell<CellData>,
  ) {
    super();
  }

  get cellState(): CellState {
    return this.repl.state(this.cell);
  }

  render(root: HTMLElement, output: HTMLElement) {
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
    if (this.cell.data.deferred != null)
      if (this.cell.data.deferred.isCompleted) {
        if (this.isValid(root))
          renderResult(root, output, this.cell.data.deferred.value[0]);
      } else {
        this.cell.data.deferred.then((result) => {
          if (this.isValid(root)) renderResult(root, output, result[0]);
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
    );
    return true;
  }

  override toDOM() {
    let root = document.createElement("div");
    let output = document.createElement("div");
    output.classList.add("CellOutput__output");
    root.appendChild(output);
    this.render(root, output);
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

function renderResult(
  root: HTMLElement,
  elem: HTMLElement,
  res: REPL.REPLResult,
) {
  if (res.type === "ok") {
    elem.textContent = res.ok ?? "";
    root.classList.add("CellOutput--ok");
    root.classList.remove("CellOutput--error");
  } else if (res.type === "error") {
    elem.textContent = res.error;
    root.classList.remove("CellOutput--ok");
    root.classList.add("CellOutput--error");
  } else if (res.type === "notice") {
    elem.textContent = res.notice;
    root.classList.add("CellOutput--ok");
    root.classList.remove("CellOutput--error");
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
    if (cell.data.deferred == null || !this.isComputed(cell)) return "dirty";
    if (!cell.data.deferred.isCompleted) return "computing";
    return "ok";
  }
}

let cellId = 0;
let onCellCreate = () => ({ id: cellId++, deferred: null, version: -1 });
