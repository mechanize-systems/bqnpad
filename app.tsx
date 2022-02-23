import * as State from "@codemirror/state";
import * as ASAP from "@mechanize/asap";
import * as React from "react";

import { suspendable } from "./PromiseUtil";
import { NO_VALUE, jsonCodec, usePersistentState } from "./ReactUtil";
import type { Codec } from "./ReactUtil";
import { Workspace } from "./Workspace";
import type { WorkspaceManager } from "./Workspace";
import { useWorkspaceConnection } from "./WorkspaceConnection";
import type { WorkspaceConnection } from "./WorkspaceConnection";
import "./app.css";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
};

ASAP.boot({ routes, AppLoading });

let workspaceCodec: Codec<Workspace> = {
  encode(w: Workspace) {
    return jsonCodec.encode({
      cells: w.cells,
      current: w.current.sliceString(0),
    });
  },
  decode(s) {
    let v = jsonCodec.decode(s);
    if (v === NO_VALUE) return v;
    return {
      cells: v.cells,
      current: State.Text.of(v.current.split("\n")),
    };
  },
};

function useLocalWorkspaceManager(): WorkspaceManager {
  let [workspace, setWorkspace] = usePersistentState<Workspace>(
    "bqn-workspace",
    () => ({
      cells: [],
      current: State.Text.of([""]),
    }),
    workspaceCodec,
  );
  return React.useMemo<WorkspaceManager>(() => {
    return {
      load: suspendable(() => workspace),
      store: (fn) => setWorkspace(fn),
    } as WorkspaceManager;
  }, []);
}

function Index() {
  let manager = useLocalWorkspaceManager();
  return (
    <React.Suspense fallback={<AppLoading />}>
      <Workspace manager={manager} />
    </React.Suspense>
  );
}

function AppLoading(_props: ASAP.AppLoadingProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      Loading...
    </div>
  );
}
