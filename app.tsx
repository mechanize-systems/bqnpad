import { suspendable } from "@bqnpad/lib/PromiseUtil";
import {
  NO_VALUE,
  jsonCodec,
  usePersistentState,
} from "@bqnpad/lib/ReactUtil";
import type { Codec } from "@bqnpad/lib/ReactUtil";
import * as State from "@codemirror/state";
import * as ASAP from "@mechanize/asap";
import * as React from "react";

import { Workspace } from "./Workspace";
import type { WorkspaceManager } from "./Workspace";
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

const INITIAL_DOC = State.Text.of(
  `
# Welcome to BQN (https://mlochbaum.github.io/BQN/) REPL!
#
# How to enter BQN glyphs:
# - Use glyph bar at the top
# - Use '\\'-prefix to enter glyphs from keyboard.
# - Enter '\\' and press Tab for completions
#
# How to evaluate BQN expressions:
# - Expressions are being evaluated as you type
# - Press 'Shift+Enter' to create a new cell (the current code is being preserved in
#   the workspace history)
#
# What else:
# - You can download workspace code as a .bqn file to your computer by pressing
#   DOWNLOAD button.
#
# Have fun ('Cmd/Ctrl-a' to select all and press 'Del' to remove this message)!

"Hello, "∾<⟜'a'⊸/ "Big Questions Notation"
  `
    .trim()
    .split("\n"),
);

export let WORKSPACE_KEY = "bqn-workspace-v2";

function useLocalWorkspaceManager(): WorkspaceManager {
  let [workspace, setWorkspace] = usePersistentState<Workspace>(
    WORKSPACE_KEY,
    () => ({
      cells: [],
      current: INITIAL_DOC,
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
