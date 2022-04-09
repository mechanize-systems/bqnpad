import * as React from "react";

import * as Base from "@mechanize/base";
import * as UI from "@mechanize/ui";

import { Logo } from "./Logo";

export type AppHeaderProps = {
  status?: React.ReactNode;
  toolbar?: React.ReactNode;
};

export function AppHeader(props: AppHeaderProps) {
  let [collapsed, setCollapsed] = Base.React.usePersistentState(
    "bqnpad-appheader-collapsed",
    () => false,
  );
  return (
    <div
      className={UI.cx(
        "WorkspaceHeader",
        collapsed && "WorkspaceHeader--collapsed",
      )}
    >
      <div className="Toolbar">
        <div style={{ display: "flex" }}>
          <UI.Button onClick={() => setCollapsed((collpased) => !collapsed)}>
            <Logo size={20} />
          </UI.Button>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <a className="title Button" href={window.location.origin}>
              BQNPAD
            </a>
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {props.status}
          <a
            target="_blank"
            className="Button"
            href="https://mlochbaum.github.io/BQN/index.html"
          >
            BQN Website ↗
          </a>
          <a
            target="_blank"
            className="Button"
            href="https://mlochbaum.github.io/BQN/keymap.html"
          >
            Keymap ↗
          </a>
          <a
            target="_blank"
            className="Button"
            href="https://mlochbaum.github.io/BQN/help/index.html"
          >
            Help ↗
          </a>
        </div>
      </div>
      {props.toolbar != null && (
        <div className="WorkspaceHeader__hideable">{props.toolbar}</div>
      )}
    </div>
  );
}
