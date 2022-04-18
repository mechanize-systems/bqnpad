import * as View from "@codemirror/view";

import * as REPL from "@bqnpad/repl";
import * as Base from "@mechanize/base";
import * as Editor from "@mechanize/editor";

import type { CellData, CellState, NotebookREPL } from "./NotebookKernel";

export class Widget extends View.WidgetType {
  _estimatedHeight: number = this.cell.data.showOutput ? -1 : 0;
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
    if (deferred.isCompleted) this.onResult(deferred.value);
    else {
      if (prevDeferred?.isCompleted) this.onResult(prevDeferred.value);
      deferred.then(this.onResult);
    }
  }

  onResult = ([result, logs]: readonly [REPL.REPLResult, string[]]) => {
    if (!this.cell.data.showOutput && result.type !== "error") return;
    let [textContent, className] = renderResult(result);
    if (logs.length > 0) textContent = logs.join("\n") + "\n" + textContent;
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
    let render = (res: readonly [REPL.REPLResult, string[]]) => {
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
      if (this.isValid(root) || force) render(this.cell.data.deferred.value);
      else renderFallback();
    } else {
      renderFallback();
      this.cell.data.deferred.then((result) => {
        if (this.isValid(root)) render(result);
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

  override eq(widget: Widget): boolean {
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

export function cellStatusColor(
  state: CellState,
  fallback: string = "transparent",
) {
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
