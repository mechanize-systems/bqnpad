/**
 * Cells extension for CodeMirror 6
 *
 * This extension adds cells structure to CodeMirror 6 text editor.
 *
 * Cells are non overlapping regions which cover the entire document. Each
 * region is an isolated subdocument.
 */
import * as History from "@codemirror/history";
import * as RangeSet from "@codemirror/rangeset";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";

import * as Base from "@mechanize/base";

export type Cells<T = any> = {
  /**
   * State field used for storing cells state.
   *
   * While cells internal state is not exposed directly the field can be used in
   * facets to register a dependency on the cells state.
   */
  field: State.StateField<never>;

  setCellSet(state: State.EditorState, cellSet: CellSet<T>): State.EditorState;

  /**
   * Cell commands.
   */
  commands: {
    /** Select cell at current cursor position. */
    select: View.Command;
    /** Insert new cell after current cell.  */
    insertAfter: View.Command;
    /** Split cell at current cursor position. */
    split: View.Command;
    /** Merge cell at current cursor position with the previous cell. */
    joinWithPrevious: View.Command;
    /** Remove current cell if it is empty. */
    removeIfEmpty: View.Command;
  };

  /**
   * Cell queries.
   */
  query: {
    /**
     * Return a set of cells for the editor state.
     */
    cells: (state: State.EditorState) => CellSet<T>;
    /**
     * Return a cell range at the position (current cursor position is used by
     * default).
     */
    cellAt(state: State.EditorState, pos?: number): CellRange<T> | null;
  };

  effects: {
    updateCells: State.StateEffectType<Map<T, T>>;
  };

  extension: State.Extension;
};

export class DocBuilder<T> {
  private items: { code: string; cell: Cell<T> }[] = [];
  add(code: string, cell: Cell<T>) {
    this.items.push({ code, cell });
  }
  finish() {
    let doc = State.Text.empty;
    let cellSet = new RangeSet.RangeSetBuilder<Cell<T>>();
    for (let i = 0; i < this.items.length; i++) {
      let isLast = i === this.items.length - 1;
      let { code, cell } = this.items[i]!;
      if (!code.endsWith("\n") && !isLast) code += "\n";
      doc = doc.append(State.Text.of(code.split("\n")));
      let pos = !isLast ? doc.length - 1 : doc.length;
      cellSet.add(pos, pos, cell);
    }
    return [doc, cellSet.finish()] as const;
  }
}

export type CellsConfig<T> = {
  /** Initial cell set (empty if not provided). */
  cellSet?: CellSet<T>;
  /** Called each time cell set is updated for the editor. */
  onCellSet?: (cells: CellSet<T>, state: State.EditorState) => void;
  /** Called when a new cell should be allocated. */
  onCellCreate: () => T;
};

export class Cell<T = any> extends RangeSet.RangeValue {
  constructor(public readonly data: T, public readonly version: number) {
    super();
  }
}

export type CellSet<T> = RangeSet.RangeSet<Cell<T>>;
export type CellRange<T> = RangeSet.Range<Cell<T>>;

const USER_EVENT_CELLS_STRUCTURE = "cells.structure";

export function configure<T>(cfg: CellsConfig<T>) {
  let {
    cellSet: cellSet0 = RangeSet.RangeSet.empty,
    onCellCreate,
    onCellSet,
  } = cfg;

  // Cell effects to control cells.
  let splitCell = State.StateEffect.define<number>();
  let removeCell = State.StateEffect.define<Cell>();
  let updateCells = State.StateEffect.define<Map<T, T>>();

  // Cell effect which replaces on cells with another
  let replaceCells = State.StateEffect.define<{
    prev: CellSet<T>;
    next: CellSet<T>;
    init: boolean;
  }>();

  let onUpdate = View.EditorView.updateListener.of((update) => {
    // TODO: Right now this is an important optimization but in general cells
    // might change without changing the doc...
    if (!update.docChanged) return;
    let cells0 = update.startState.field(cellsField);
    let cells1 = update.state.field(cellsField);
    if (cells0 !== cells1 && onCellSet != null)
      onCellSet(query.cells(update.state), update.state);
  });

  let cellsField = State.StateField.define<CellSet<T>>({
    create(state) {
      let cellSet = cellSet0;
      if (cellSet.size === 0)
        cellSet = cellSet.update({
          add: [
            {
              from: 0,
              to: state.doc.length,
              value: new Cell(onCellCreate(), 0),
            },
          ],
        });
      return cellSet;
    },
    update(cells, tr) {
      // Note that we are processing replaceCells effect only here. The idea is
      // that this effect is reversable and plays well with history (see
      // cellsHistory facet below). Therefore all other cell effects are being
      // translated in replaceCells effect.
      for (let e of Base.Array.reversed(tr.effects))
        if (e.is(replaceCells)) return e.value.next;
      return cells;
    },
  });

  // Disable all edits which touch cell boundaries.
  //
  // This is done so cells structure is not "fragile" and instead we expose
  // commands (see below) to manipulate it explicitly.
  let transactionFilter = State.EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged) return tr;
    let cells = tr.startState.field(cellsField);
    for (let it = cells.iter(); it.value != null; it.next()) {
      let next = tr.changes.mapPos(it.to, 0, State.MapMode.TrackAfter);
      if (next == null) return [];
    }
    return tr;
  });

  let cellsEffect = State.EditorState.transactionExtender.of((tr) => {
    if (tr.isUserEvent("undo") || tr.isUserEvent("redo")) return {};

    let cells0 = tr.startState.field(cellsField);
    let cells1 = cells0;

    // process changes
    if (tr.docChanged) cells1 = cells1.map(tr.changes);

    // collect needed metadata from cell effects
    let split: number[] = [];
    let split0: Set<number> = new Set();
    let removed: Set<Cell> = new Set();
    let updated: Map<T, T> = new Map();
    for (let e of tr.effects)
      if (e.is(replaceCells) && e.value.init) return {};
      else if (e.is(splitCell)) {
        split.push(e.value);
        split0.add(e.value);
      } else if (e.is(removeCell)) removed.add(e.value);
      else if (e.is(updateCells))
        for (let [k, v] of e.value.entries()) updated.set(k, v);
    split.sort();

    let touched = false;

    function rebuild(it: RangeSet.RangeCursor<Cell>, from: number) {
      let cell = it.value!;
      let cellData = updated.get(cell.data) ?? cell.data;
      touched = touched || touchesCellRange(tr, from, it.to);
      if (touched) cell = new Cell(cellData, cell.version + 1);
      else if (cellData !== cell.data) cell = new Cell(cellData, cell.version);
      return cell;
    }

    // rebuild cellset
    let b = new RangeSet.RangeSetBuilder<Cell<T>>();
    let cells: [cell: Cell<T>, to: number][] = [];
    let from = 0;
    for (let it = cells1.iter(); it.value != null; it.next()) {
      if (removed.has(it.value)) continue;
      // if there splits before we need to process them first
      if (split.length > 0 && split[0]! <= it.to) {
        touched = touched || split[0]! < it.to - 1;
        // the cell before the first split receives the cell state
        let value: Cell<T> | null = rebuild(it, from);
        while (split.length > 0 && split[0]! <= it.to) {
          cells.push([value ?? new Cell(onCellCreate(), 0), split.shift()!]);
          value = null;
        }
        // add original cell now
        cells.push([new Cell(onCellCreate(), 0), it.to]);
      } else {
        // ignore dups
        if (cells.length > 0 && cells[cells.length - 1]![1] === it.to)
          continue;
        cells.push([rebuild(it, from), it.to]);
      }
      from = it.to;
    }
    for (let i = 0; i < cells.length; i++) {
      let [cell, to] = cells[i]!;
      if (i < cells.length - 1) b.add(to, to, cell);
      // last cell is always attached at the doc end
      else b.add(tr.newDoc.length, tr.newDoc.length, cell);
    }
    cells1 = b.finish();
    let cellsStructureChanged =
      removed.size > 0 || split0.size > 0 || cells1.size !== cells0.size;
    return {
      effects: replaceCells.of({
        prev: cells0,
        next: cells1,
        init: false,
      }),
      annotations: cellsStructureChanged
        ? [
            History.isolateHistory.of("full"),
            State.Transaction.userEvent.of(USER_EVENT_CELLS_STRUCTURE),
          ]
        : undefined,
    };
  });

  let cellsHistory = History.invertedEffects.of((tr) => {
    for (let e of tr.effects)
      if (e.is(replaceCells))
        return [
          replaceCells.of({
            prev: e.value.next,
            next: e.value.prev,
            init: false,
          }),
        ];
    return [];
  });

  let query0 = {
    cellAt(state: State.EditorState, pos?: number) {
      if (pos == null) pos = state.selection.main.to;
      let cells = query0.cells(state);
      let before: CellRange<T>[] = [];
      let from = 0;
      let it;
      for (it = cells.iter(); it.value != null; it.next()) {
        if (from <= pos && pos <= it.to) break;
        before.push(it.value.range(it.from, it.to));
        from = it.to;
      }
      return [it, before] as const;
    },
    cells(state: State.EditorState) {
      return state.field(cellsField);
    },
  };

  let query: Cells<T>["query"] = {
    cells(state: State.EditorState): CellSet<T> {
      let from = 0;
      let b = new RangeSet.RangeSetBuilder<Cell<T>>();
      for (let it = query0.cells(state).iter(); it.value != null; it.next()) {
        b.add(
          Math.min(from, state.doc.length),
          Math.min(Math.max(from, it.to), state.doc.length),
          it.value,
        );
        from = it.to + 1;
      }
      return b.finish();
    },
    cellAt(state: State.EditorState, pos?: number) {
      let [it, before] = query0.cellAt(state, pos);
      let prev = before[before.length - 1];
      let from = prev != null ? prev.to + 1 : 0;
      return it.value?.range(from, it.to) ?? null;
    },
  };

  let commands: Cells<T>["commands"] = {
    insertAfter: (view) => {
      let cell = query.cellAt(view.state)!;
      view.dispatch({
        changes: { insert: "\n", from: cell.to, to: cell.to },
        selection: State.EditorSelection.cursor(cell.to + 1),
        effects: [splitCell.of(cell.to)],
      });
      return true;
    },
    split: (view) => {
      let at = view.state.selection.main.to;
      let line = view.state.doc.lineAt(at);
      let cell = query.cellAt(view.state);
      if (at === line.from && cell?.from !== at)
        // If we are at the start of the line within the cell do not insert a
        // new line, split before existing.
        view.dispatch({
          effects: [splitCell.of(at - 1)],
        });
      else
        view.dispatch({
          changes: { insert: "\n", from: at, to: at },
          selection: State.EditorSelection.cursor(at + 1),
          effects: [splitCell.of(at)],
        });
      return true;
    },
    select: (view) => {
      let cell = query.cellAt(view.state)!;
      view.dispatch({
        selection: State.EditorSelection.range(
          cell.from === 0 ? 0 : cell.from,
          Math.min(cell.to, view.state.doc.length),
        ),
        userEvent: "select",
      });
      return true;
    },
    joinWithPrevious: (view) => {
      let [_it, before] = query0.cellAt(view.state);
      let prev = before[before.length - 1];
      if (prev == null) return true;
      view.dispatch({
        filter: false,
        effects: [removeCell.of(prev.value)],
      });
      return true;
    },
    removeIfEmpty: (view) => {
      if (view.state.selection.ranges.length !== 1) return false;
      let at = view.state.selection.main.to;
      let cells = view.state.field(cellsField);
      for (let it = cells.iter(); it.value != null; it.next()) {
        if (at === 0 && it.to === 0 && view.state.doc.length > 0) {
          view.dispatch({
            filter: false,
            changes: { insert: "", from: 0, to: 1 },
            effects: [removeCell.of(it.value)],
          });
          return true;
        } else if (it.to === at - 1) {
          it.next();
          if (it.to !== at && view.state.doc.length !== at) continue;
          view.dispatch({
            filter: false,
            changes: { insert: "", from: at - 1, to: at },
            effects: [removeCell.of(it.value)],
          });
          return true;
        }
      }
      return false;
    },
  };

  function setCellSet(state: State.EditorState, cellSet: CellSet<T>) {
    return state.update({
      effects: replaceCells.of({
        prev: RangeSet.RangeSet.empty,
        next: cellSet,
        init: true,
      }),
      annotations: [State.Transaction.addToHistory.of(false)],
    }).state;
  }

  let cells: Cells<T> = {
    field: cellsField,
    setCellSet,
    query,
    commands,
    effects: { updateCells },
    extension: [
      cellsField,
      cellsEffect,
      cellsHistory,
      transactionFilter,
      onUpdate,
    ],
  };

  return cells;
}

function touchesCellRange(tr: State.Transaction, from: number, to: number) {
  let yes = false;
  tr.changes.iterChanges((fromA, toA, fromB, toB, ins) => {
    if (
      fromA === toA &&
      toA === to - 1 &&
      fromB - toB === -1 &&
      ins.length === 1 &&
      ins.sliceString(0) === "\n"
    )
      // This is an insert of \n, we DO NOT mark range as changed then.
      return;
    if (
      fromA - toA === -1 &&
      toA === to + 1 &&
      fromB === toB &&
      ins.length === 0 &&
      tr.startState.doc.sliceString(fromA, toA) === "\n"
    )
      // This is a remove of \n, we DO NOT mark range as changed then.
      return;
    if (!yes) {
      if (from <= fromA && fromA <= to) yes = true;
      if (from <= toA && toA <= to) yes = true;
      if (fromA <= from && to <= toA) yes = true;
    }
  }, true);
  return yes;
}

export type LineDecorationSpec = Parameters<typeof View.Decoration.line>[0];

/**
 * Add line decoration to a currently focused cell.
 */
export function cellsFocusDecoration(
  cells: Cells,
  decorationSpec: LineDecorationSpec,
) {
  function compute(view: View.EditorView) {
    if (!view.hasFocus) return View.Decoration.none;

    let state = view.state;
    let doc = state.doc;

    let cs = cells.query.cells(state);
    if (cs.size === 0) return View.Decoration.none;

    let cursor = state.selection.main.to;
    for (let it = cs.iter(); it.value != null; it.next())
      if (it.from <= cursor && cursor <= it.to) {
        let s = doc.lineAt(it.from);
        let e = doc.lineAt(it.to);
        let b = new RangeSet.RangeSetBuilder<View.Decoration>();
        while (s.number <= e.number) {
          b.add(s.from, s.from, View.Decoration.line(decorationSpec));
          if (s.number === doc.lines) break;
          else s = doc.line(s.number + 1);
        }
        return b.finish();
      }

    return View.Decoration.none;
  }

  return View.ViewPlugin.fromClass(
    class {
      decorations: View.DecorationSet;

      constructor(view: View.EditorView) {
        this.decorations = compute(view);
      }

      update(update: View.ViewUpdate) {
        this.decorations = compute(update.view);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

/**
 * Apply line decorations per cell.
 */
export function cellsLineDecoration<T>(
  cells: Cells<T>,
  makeDecorationSpec: (
    cell: Cell<T>,
    state: State.EditorState,
  ) => LineDecorationSpec | null,
) {
  function compute(view: View.EditorView) {
    let doc = view.state.doc;
    let cs = cells.query.cells(view.state);
    if (cs.size === 0) return View.Decoration.none;
    let b = new RangeSet.RangeSetBuilder<View.Decoration>();
    for (let it = cs.iter(); it.value != null; it.next()) {
      Base.assert(it.from <= it.to);
      let s = doc.lineAt(it.from);
      let e = doc.lineAt(it.to);
      let deco = makeDecorationSpec(it.value, view.state);
      if (deco != null)
        while (s.number <= e.number) {
          b.add(s.from, s.from, View.Decoration.line(deco));
          if (s.number === doc.lines) break;
          else s = doc.line(s.number + 1);
        }
    }
    return b.finish();
  }

  return View.ViewPlugin.fromClass(
    class {
      decorations: View.DecorationSet;

      constructor(view: View.EditorView) {
        this.decorations = compute(view);
      }

      update(update: View.ViewUpdate) {
        this.decorations = compute(update.view);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

export type DecorateCell<T> = (
  builder: RangeSet.RangeSetBuilder<View.Decoration>,
  range: CellRange<T>,
  state: State.EditorState,
) => void;

/**
 * Add widget decorations to cells.
 */
export function cellsWidgetDecoration<T>(
  cells: Cells<T>,
  decorate: DecorateCell<T>,
) {
  function compute(state: State.EditorState) {
    let cs = cells.query.cells(state);
    if (cs.size === 0) return View.Decoration.none;
    let b = new RangeSet.RangeSetBuilder<View.Decoration>();
    for (let it = cs.iter(); it.value != null; it.next())
      decorate(b, it.value.range(it.from, it.to), state);
    return b.finish();
  }
  return View.EditorView.decorations.compute(["doc", cells.field], compute);
}
