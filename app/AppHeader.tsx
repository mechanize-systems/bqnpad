import * as React from "react";

export type AppHeaderProps = {
  status?: React.ReactNode;
  toolbar?: React.ReactNode;
};

export function AppHeader(props: AppHeaderProps) {
  return (
    <div className="WorkspaceHeader">
      <div className="Toolbar">
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <a className="title Button" href={window.location.origin}>
            BQNPAD
          </a>
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
        {props.status != null && (
          <div style={{ display: "flex" }}>{props.status}</div>
        )}
      </div>
      {props.toolbar}
    </div>
  );
}
