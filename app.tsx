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

import * as Workspace from "./Workspace";
import type { WorkspaceCell, WorkspaceManager } from "./Workspace";
import "./app.css";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
};

ASAP.boot({ routes, AppLoading });

let workspaceCodec: Codec<Workspace.Workspace> = {
  encode(w: Workspace.Workspace) {
    let cells: WorkspaceCell[] = w.cells.map((c) => ({ ...c, result: null }));
    return jsonCodec.encode({
      cells: cells,
      doc: w.doc.sliceString(0),
    });
  },
  decode(s): Workspace.Workspace {
    let v = jsonCodec.decode(s);
    if (v === NO_VALUE) return v;
    let doc = State.Text.of(v.doc.split("\n"));
    return {
      cells: v.cells,
      currentCell: {
        result: null,
        from: v.cells[v.cells.length - 1]?.to ?? 0,
        to: v.doc.length,
      },
      doc,
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

export let WORKSPACE_KEY = "bqn-workspace-v3";

function useLocalWorkspaceManager(): WorkspaceManager {
  let [workspace, setWorkspace] = usePersistentState<Workspace.Workspace>(
    WORKSPACE_KEY,
    () => Workspace.of(INITIAL_DOC),
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
      <Workspace.Workspace manager={manager} />
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
