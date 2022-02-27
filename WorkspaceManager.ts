import * as Lib from "@bqnpad/lib";
import * as React from "react";

import * as Workspace0 from "./Workspace0";

export interface WorkspaceManager {
  load(): Lib.PromiseUtil.Suspendable<Workspace0.Workspace0>;
  store(fn: (workspace: Workspace0.Workspace0) => Workspace0.Workspace0): void;
  reset(): void;
}

export let WORKSPACE_KEY = "bqn-workspace-v3";

export function useLocalWorkspaceManager(
  makeWorkspace: () => Workspace0.Workspace0,
): WorkspaceManager {
  let [workspace, setWorkspace] =
    Lib.ReactUtil.usePersistentState<Workspace0.Workspace0>(
      WORKSPACE_KEY,
      makeWorkspace,
    );
  return React.useMemo<WorkspaceManager>((): WorkspaceManager => {
    return {
      load: Lib.PromiseUtil.suspendable(() => workspace),
      store(fn) {
        setWorkspace(fn);
      },
      reset() {
        window.localStorage.removeItem(WORKSPACE_KEY);
        window.location.reload();
      },
    };
  }, []);
}
