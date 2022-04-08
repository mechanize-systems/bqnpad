import * as React from "react";

import * as Base from "@mechanize/base";

import * as Workspace0 from "./Workspace0";

export interface WorkspaceManager {
  load(): Base.Promise.Suspendable<Workspace0.Workspace0>;
  store(fn: (workspace: Workspace0.Workspace0) => Workspace0.Workspace0): void;
  restart(): void;
}

/**
 * Workspace manager which stores workspace in a browser's `localStorage`.
 */
export function useLocalWorkspaceManager(
  makeWorkspace: () => Workspace0.Workspace0,
): WorkspaceManager {
  let [workspace, setWorkspace] =
    Base.React.usePersistentState<Workspace0.Workspace0>(
      WORKSPACE_KEY,
      makeWorkspace,
    );
  let workspace0 = Base.React.useMemoOnce(() => workspace);
  return React.useMemo<WorkspaceManager>((): WorkspaceManager => {
    return {
      load: Base.Promise.suspendable(() => workspace0),
      store(fn) {
        setWorkspace(fn);
      },
      restart() {
        window.location.reload();
      },
    };
  }, [workspace0, setWorkspace]);
}

export function useURLWorkspaceManager(): WorkspaceManager {
  return React.useMemo<WorkspaceManager>(() => {
    let url = new URL(window.location.toString());
    let code = decodeURIComponent(url.searchParams.get("bqn") ?? "");
    let workspace = decodeWorkspace(code);
    return {
      load: Base.Promise.suspendable(() => workspace),
      store(fn) {
        workspace = fn(workspace);
        let code = encodeWorkspace(workspace);
        history.replaceState(null, "", `/s?bqn=${encodeURIComponent(code)}`);
      },
      restart() {
        window.location.reload();
      },
    };
  }, []);
}

export function encodeWorkspace(
  workspace: Workspace0.Workspace0,
  session?: Workspace0.Session0,
): string {
  if (session == null) session = workspace.currentSession;
  let isCurrent = session === workspace.currentSession;

  let from = 0;
  let to = 0;
  if (isCurrent && session.cells.length === 0)
    from = workspace.currentCell.from;
  else if (session.cells.length > 0) from = session.cells[0]!.from;
  if (isCurrent) to = workspace.currentCell.to;
  else if (session.cells.length > 0)
    to = session.cells[session.cells.length - 1]!.to;

  let encodeCell = (cell: Workspace0.WorkspaceCell0) => ({
    from: cell.from - from,
    to: cell.to - from,
    result: null,
  });

  workspace = {
    doc: workspace.doc.slice(from, to),
    prevSessions: [],
    currentSession: {
      cells: session.cells.map(encodeCell),
      createdAt: session.createdAt,
    },
    currentCell: isCurrent
      ? encodeCell(workspace.currentCell)
      : encodeCell({ from: to, to, result: null }),
  };
  let data = JSON.stringify(workspace);
  return btoa(String.fromCharCode(...new TextEncoder().encode(data)));
}

function decodeWorkspace(code: string): Workspace0.Workspace0 {
  let data = new TextDecoder().decode(
    new Uint8Array([...atob(code)].map((c) => c.charCodeAt(0))),
  );
  return JSON.parse(data) as Workspace0.Workspace0;
}

export let WORKSPACE_KEY = `bqn-workspace-v${Workspace0.version}`;
