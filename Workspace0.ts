/**
 * Workspace0 represents workspace serialization format.
 */
import type { REPLResult } from "./REPL";

/** Workspace0 version, increment each time you change types here. */
export const version = 5;

export type Workspace0 = {
  /** A list of previous (non-active) sessions. */
  prevSessions: Session0[];
  /** Current session (it's the one being evaluated). */
  currentSession: Session0;
  /** Current cell. */
  currentCell: WorkspaceCell0;
  /** Entire document. */
  doc: string;
};

export type Session0 = {
  /* The datetime session was started/created. */
  createdAt: number;
  cells: WorkspaceCell0[];
};

export type WorkspaceCell0 = {
  /** `from`/`to` represent a range into the workspace's `doc`. */
  from: number;
  /** `from`/`to` represent a range into the workspace's `doc`. */
  to: number;
  /** Evaluation result (if present). */
  result: REPLResult | null;
};

/** Create a new workspace with a single (current) cell. */
export function make(doc: string): Workspace0 {
  return {
    doc,
    prevSessions: [],
    currentSession: {
      createdAt: Date.now(),
      cells: [],
    },
    currentCell: { from: 0, to: doc.length, result: null },
  };
}

/** An empty workspace. */
export let empty: Workspace0 = make("");
