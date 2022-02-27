/**
 * Workspace0 represents workspace serialization format.
 */

export type Workspace0 = {
  doc: string;
  cells: WorkspaceCell0[];
  currentCell: WorkspaceCell0;
};

export type WorkspaceCell0 = {
  from: number;
  to: number;
};

export let empty: Workspace0 = {
  doc: "",
  cells: [],
  currentCell: { from: 0, to: 0 },
};

export function make(doc: string): Workspace0 {
  return {
    doc,
    cells: [],
    currentCell: { from: 0, to: doc.length },
  };
}
