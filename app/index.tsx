import * as ASAP from "@mechanize/asap";
import * as React from "react";

import * as Workspace from "./Workspace";
import * as Workspace0 from "./Workspace0";
import * as WorkspaceManager from "./WorkspaceManager";
import "./index.css";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
  shared: ASAP.route("/s", async () => ({ default: Shared })),
};

ASAP.boot({ routes, AppLoading });

const INITIAL_DOC = `
# Welcome to BQN (https://mlochbaum.github.io/BQN/) REPL!
#
# How to enter BQN glyphs:
# - Use glyph bar at the top
# - Use '\\'-prefix to enter glyphs from keyboard.
# - Press 'Tab' for completions
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
    <Chrome>
      <Workspace.Workspace manager={manager} />
    </Chrome>
  );
}

function Shared() {
  let manager = WorkspaceManager.useURLWorkspaceManager();
  React.useLayoutEffect(() => {
    document.title = "BQNPAD";
  }, []);
  return (
    <Chrome>
      <Workspace.Workspace
        manager={manager}
        disableSessionBanner={true}
        disableSessionControls={true}
      />
    </Chrome>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    document.title = "BQNPAD";
  }, []);
  return <React.Suspense fallback={<AppLoading />}>{children}</React.Suspense>;
}

function AppLoading(_props: ASAP.AppLoadingProps) {
  return <div className="AppLoading">Loading...</div>;
}
