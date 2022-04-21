import * as View from "@codemirror/view";
// @ts-ignore
import * as Plot from "@observablehq/plot";

import * as REPL from "@bqnpad/repl";
import * as Base from "@mechanize/base";
import * as Editor from "@mechanize/editor";

import type { CellData, CellState, NotebookREPL } from "./NotebookKernel";

type Rendered = {
  status: REPL.REPLResult["type"];
  className: string;
  effects: Block[];
  result: Block;
};

type Block = {
  element: HTMLElement;
  height: number;
};

function renderOutput([result, effects]: REPL.REPLOutput): Rendered {
  let createTextBlock = (text: string): Block => {
    let element = document.createElement("div");
    let lineCount = text === "" ? 0 : (text.match(/\n/g) ?? []).length + 1;
    element.textContent = text;
    return { element, height: lineCount * 28 };
  };

  let effectBlocks: Block[] = [];
  if (effects.length > 0) {
    for (let eff of effects) {
      switch (eff.type) {
        case "show":
          effectBlocks.push(createTextBlock(eff.v));
          break;
        case "plot": {
          effectBlocks.push({
            element: plot(eff.v, { height: 28 * 10 }),
            height: 10 * 28,
          });
          break;
        }
        default:
          Base.never(eff);
      }
    }
  }

  let [textContent, className] = renderResult(result);
  let resultBlock = createTextBlock(textContent);
  return {
    status: result.type,
    className,
    effects: effectBlocks,
    result: resultBlock,
  };
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

// Keep rendered state in a WeakMap as on widget updates we are not allowed to
// transfer state between prev and current widgets.
let cached: WeakMap<
  Base.Promise.Deferred<REPL.REPLOutput>,
  Base.Promise.Deferred<Rendered>
> = new WeakMap();

function render0(deferred: Base.Promise.Deferred<REPL.REPLOutput>) {
  let c = cached.get(deferred);
  if (c == null) cached.set(deferred, (c = deferred.then(renderOutput)));
  return c;
}

function render(cell: CellData): {
  value: Rendered | null;
  promise: Promise<Rendered> | null;
} {
  let c0 = render0(cell.deferred);
  if (c0.isCompleted) return { value: c0.value, promise: null };
  else if (cell.prevDeferred != null) {
    let c1 = render0(cell.prevDeferred);
    return { value: c1.isCompleted ? c1.value : null, promise: c0.promise };
  } else return { value: null, promise: c0.promise };
}

export class Widget extends View.WidgetType {
  rendered: { value: Rendered | null; promise: Promise<Rendered> | null };
  mounted: boolean = false;

  constructor(
    private readonly view: { current: View.EditorView | null },
    private readonly repl: NotebookREPL,
    private readonly cell: Editor.Cells.Cell<CellData>,
  ) {
    super();
    this.rendered = render(this.cell.data);
    if (this.rendered.promise != null)
      this.rendered.promise = this.rendered.promise.then((value) => {
        this.rendered = { value, promise: null };
        if (this.mounted) this.view.current!.requestMeasure();
        return value;
      });
  }

  get cellState(): CellState {
    return this.repl.state(this.cell);
  }

  override get estimatedHeight(): number {
    let { value } = this.rendered;
    if (value != null) {
      let h =
        this.cell.data.showOutput || value.status === "error"
          ? value.result.height
          : 0;
      for (let b of value.effects) h += b.height;
      return h;
    } else return -1;
  }

  override destroy(_dom: HTMLElement): void {
    this.mounted = false;
  }

  render(root: HTMLElement, output: HTMLElement, force: boolean) {
    this.mounted = true;

    root.dataset["cellId"] = String(this.cell.data.id);
    root.dataset["cellVersion"] = String(this.cell.version);

    root.className = "CellOutput";
    root.style.setProperty(
      "--cell-status-color",
      cellStatusColor(this.cellState, "transparent"),
    );
    root.style.setProperty(
      "--cell-status-marker-color",
      cellStatusColor(this.cellState, "var(--app-border-ui)"),
    );

    output.style.opacity =
      this.cellState === "dirty" || this.cellState === "computing"
        ? "0.3"
        : "1.0";

    let doRender = (rendered: Rendered) => {
      root.className = rendered.className;
      root.style.height = `${this.estimatedHeight}px`;
      while (output.firstChild != null) output.removeChild(output.lastChild!);
      for (let e of rendered.effects) output.append(e.element.cloneNode(true));
      if (this.cell.data.showOutput || rendered.status === "error")
        output.append(rendered.result.element.cloneNode(true));
    };

    if (this.rendered.value != null) doRender(this.rendered.value);
    if (this.rendered.promise != null)
      this.rendered.promise.then((rendered) => {
        if (this.isValid(root)) doRender(rendered);
      });
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

type PlotOptions = {
  height: number;
};

function plot(v: any, options: PlotOptions): HTMLElement {
  let spec = { marks: [] as any[], facet: v.facet };
  let marks = Array.isArray(v.marks) ? v.marks : [v.marks];
  for (let m of marks) spec.marks.push(plotMark(m));
  let plot = Plot.plot({
    ...spec,
    height: options.height,
    grid: true,
    style: {
      background: "transparent",
      color: "var(--app-color-dimmed)",
      fontFamily: "var(--app-font-family-monospace)",
    },
  });
  return plot;
}

function plotMark(m: any): any {
  switch (m.mark) {
    case "line":
      return Plot.line(m.x, {
        x: m.x,
        y: m.y,
        z: m.z,
        stroke: m.stroke,
        strokeWidth: m.strokewidth,
      });
    case "bary":
      return Plot.barY(m.x, {
        x: m.x,
        y: m.y,
      });
    case "barx":
      return Plot.barX(m.x, {
        x: m.x,
        y: m.y,
      });
    case "dot":
      return Plot.dot(m.x, {
        x: m.x,
        y: m.y,
        z: m.z,
        r: m.r,
        fill: m.fill,
        stroke: m.stroke,
        symbol: m.symbol,
      });
    case "frame":
      return Plot.frame({ stroke: "var(--app-border)" });
    default:
      console.error(m);
      Base.assert(false, `unknown mark`);
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
