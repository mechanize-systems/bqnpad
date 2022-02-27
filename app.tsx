import * as ASAP from "@mechanize/asap";
import * as React from "react";

import * as Workspace from "./Workspace";
import * as Workspace0 from "./Workspace0";
import * as WorkspaceManager from "./WorkspaceManager";
import "./app.css";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
};

ASAP.boot({ routes, AppLoading });

const INITIAL_DOC = `
# Welcome to BQN (https://mlochbaum.github.io/BQN/) REPL!
#
# How to enter BQN glyphs:
# - Use glyph bar at the top
# - Use '\\'-prefix to enter glyphs from keyboard.
# - Enter '\\' and press Tab for completions
# 
# Expressions are being evaluated as you type. Press 'Shift+Enter'
# to create a new cell (the current code is being preserved in the
# workspace history).
#
# Have fun!

"Hello, "∾<⟜'a'⊸/ "Big Questions Notation"
`.trim();

function Index() {
  let manager = WorkspaceManager.useLocalWorkspaceManager(() =>
    Workspace0.make(INITIAL_DOC),
  );
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
