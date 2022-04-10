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

import * as AppHeader from "./AppHeader";
import * as Chrome from "./Chrome";
import { FontSelect } from "./FontSelect";
import { ThemeSelect } from "./ThemeSelect";

export default function Notebook() {
  let [theme, themePref, setThemePref] = UI.useTheme();
  let editorElement = React.useRef<null | HTMLDivElement>(null);
  let editor = React.useRef<null | View.EditorView>(null);
  let darkThemeExtension = Editor.useStateField(editor, theme === "dark", [
    theme,
  ]);
  let [_cells, cellsKeymap, cellsExtension] = React.useMemo(
    () => notebookExtension(),
    [],
  );
  Editor.useEditor(editorElement, editor, {
    doc: State.Text.of([""]),
    extensions: React.useMemo(
      () => [
        View.keymap.of(cellsKeymap),
        View.keymap.of([{ key: "Tab", run: Autocomplete.startCompletion }]),
        View.keymap.of(History.historyKeymap),
        View.keymap.of(Commands.defaultKeymap),
        cellsExtension,
        History.history(),
        LangBQN.bqn(),
        Language.indentOnInput(),
        darkThemeExtension,
        View.EditorView.darkTheme.from(darkThemeExtension),
        CloseBrackets.closeBrackets(),
        Editor.scrollMarginBottom(150),
      ],
      [darkThemeExtension, cellsKeymap, cellsExtension],
    ),
  });
  React.useLayoutEffect(() => {
    editor.current!.focus();
  }, []);

  let settings = (
    <>
      <ThemeSelect themePref={themePref} onThemePref={setThemePref} />
      <FontSelect />
    </>
  );

  return (
    <Chrome.Chrome>
      <div className="Notebook">
        <AppHeader.AppHeader theme={theme} settings={settings} />
        <div className="Editor" ref={editorElement} />
      </div>
    </Chrome.Chrome>
  );
}

type Cell = {
  readonly id: number;
  readonly deferred: null | Base.Promise.Deferred<
    readonly [REPL.REPLResult, string[]]
  >;
};

type CellState = "ok" | "dirty" | "computing";

function notebookExtension() {
  let versions = new Map<number, number>();
  let repl = REPL.makeREPL("bqnjs");

  function cellState({ cell, version }: Editor.Cells.Cell<Cell>): CellState {
    if (cell.deferred == null || (versions.get(cell.id) ?? -1) !== version)
      return "dirty";
    if (!cell.deferred.isCompleted) return "computing";
    return "ok";
  }

  let cellId = 0;
  let [cells, cellsExtension] = Editor.Cells.configure<Cell>({
    onCellCreate: () => ({ id: cellId++, deferred: null, version: -1 }),
  });

  let runCell: View.Command = (view) => {
    let cur = cells.query.cellAt(view.state)!;

    let toRun: { from: number; to: number; cell: Editor.Cells.Cell<Cell> }[] =
      [];
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
        if (it.value.cell.id === id) return it.value;
      return null;
    }

    async function run() {
      for (let { from, to, cell } of toRun) {
        let state = cellState(cell);
        if (state === "computing") await cell.cell.deferred;
        else if (state === "ok") continue;
        else if (state === "dirty") {
          let code = view.state.doc.sliceString(from, to).trim();
          let deferred =
            Base.Promise.deferred<readonly [REPL.REPLResult, string[]]>();

          let newCell = { ...cell.cell, deferred, version: cell.version };
          versions.set(cell.cell.id, cell.version);
          view.dispatch({
            effects: [
              cells.effects.updateCells.of(new Map([[cell.cell, newCell]])),
            ],
            annotations: [State.Transaction.addToHistory.of(false)],
          });
          repl.eval(code).then(deferred.resolve, deferred.reject);

          let result = await deferred.promise;
          let curCell = getById(cell.cell.id);
          if (curCell != null && curCell.version === cell.version) {
            view.dispatch({
              effects: [
                cells.effects.updateCells.of(
                  new Map([[curCell.cell, { ...curCell.cell }]]),
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
    { key: "Backspace", run: cells.commands.removeIfEmpty },
    { key: "Meta-Enter", run: cells.commands.insertAfter },
    { key: "Meta-Backspace", run: cells.commands.mergeWithPrevious },
    { key: "Mod-a", run: cells.commands.select },
    { key: "Shift-Enter", run: runCell },
    { key: "Meta-Shift-Enter", run: runCellAndInsertAfter },
  ];

  let outputDecoration = Editor.Cells.cellsWidgetDecoration(
    cells,
    (builder, cellRange) => {
      builder.add(
        cellRange.to,
        cellRange.to,
        View.Decoration.widget({
          widget: new OutputWidget(cellRange.value),
          block: true,
          side: 1,
        }),
      );
    },
  );

  let cellsDeco = Editor.Cells.cellsLineDecoration(
    cells,
    (cell: Editor.Cells.Cell) => {
      let state = cellState(cell);
      let borderColor =
        state === "ok"
          ? "transparent"
          : state === "dirty"
          ? "var(--app-border)"
          : state === "computing"
          ? "var(--app-color-progress)"
          : Base.never(state);
      return {
        attributes: {
          class: "CellLine",
          style: `--cell-status-color: ${borderColor}`,
        },
      };
    },
  );

  let focusCellsDeco = Editor.Cells.cellsFocusDecoration(cells, {
    attributes: { class: "CellLine--active" },
  });

  class OutputWidget extends View.WidgetType {
    constructor(public readonly cell: Editor.Cells.Cell<Cell>) {
      super();
    }

    get cellState(): CellState {
      return cellState(this.cell);
    }

    render(root: HTMLElement, output: HTMLElement) {
      root.dataset["cellId"] = String(this.cell.cell.id);
      root.dataset["cellVersion"] = String(this.cell.version);
      if (this.cellState === "dirty" || this.cellState === "computing") {
        output.style.opacity = "0.3";
      } else {
        output.style.opacity = "1.0";
      }
      root.classList.add("CellOutput");
      if (this.cell.cell.deferred != null)
        if (this.cell.cell.deferred.isCompleted) {
          if (this.isValid(root))
            renderResult(root, output, this.cell.cell.deferred.value[0]);
        } else {
          this.cell.cell.deferred.then((result) => {
            if (this.isValid(root)) renderResult(root, output, result[0]);
          });
        }
    }

    isValid(root: HTMLElement) {
      return (
        root.dataset["cellId"] === String(this.cell.cell.id) &&
        root.dataset["cellVersion"] === String(this.cell.version) &&
        this.cell.version === (versions.get(this.cell.cell.id) ?? -1)
      );
    }

    override eq(widget: OutputWidget): boolean {
      return this.cell === widget.cell && this.cellState === widget.cellState;
    }

    override updateDOM(root: HTMLElement): boolean {
      let canUpdate = root.dataset["cellId"] === String(this.cell.cell.id);
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

  return [
    cells,
    keymap,
    [
      cellsExtension,
      outputDecoration,
      cellsDeco,
      focusCellsDeco,
    ] as State.Extension,
  ] as const;
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
