import * as Base from "@mechanize/base";
import * as React from "react";

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
  return React.useMemo<WorkspaceManager>((): WorkspaceManager => {
    return {
      load: Base.Promise.suspendable(() => workspace),
      store(fn) {
        setWorkspace(fn);
      },
      restart() {
        window.location.reload();
      },
    };
  }, []);
}

export let WORKSPACE_KEY = `bqn-workspace-v${Workspace0.version}`;
