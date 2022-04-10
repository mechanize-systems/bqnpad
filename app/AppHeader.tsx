import * as React from "react";

import * as Base from "@mechanize/base";
import * as UI from "@mechanize/ui";

import { GlyphPalette } from "./GlyphPalette";
import { Logo } from "./Logo";

export type AppHeaderProps = {
  status?: React.ReactNode;
  toolbar?: React.ReactNode;
  settings?: React.ReactNode;
  settingsRight?: React.ReactNode;
  theme: UI.Theme;
};

export function AppHeader(props: AppHeaderProps) {
  let [collapsed, setCollapsed] = Base.React.usePersistentState(
    "bqnpad-appheader-collapsed",
    () => false,
  );
  let [showGlyphbar, setShowGlyphbar] = Base.React.usePersistentState(
    "bqnpad-pref-showGlyphbar",
    () => true,
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
          <UI.Button onClick={() => setCollapsed((collapsed) => !collapsed)}>
            <Logo size={20} />
          </UI.Button>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <a className="title Button" href={window.location.origin}>
              BQNPAD
            </a>
          </div>
        </div>
        <div
          className={UI.cx(
            "WorkspaceHeader__topRight",
            "WorkspaceHeader__hideable",
          )}
        >
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
      <div className="WorkspaceHeader__hideable">
        {props.toolbar}
        <div className="Toolbar" style={{ justifyContent: "space-between" }}>
          <div
            className="Toolbar__section"
            style={{ display: "flex", alignItems: "baseline" }}
          >
            {props.settings}
          </div>
          <div
            className="Toolbar__section"
            style={{ display: "flex", alignItems: "baseline" }}
          >
            {props.settingsRight}
            <UI.Checkbox value={showGlyphbar} onValue={setShowGlyphbar}>
              Show glyphs
            </UI.Checkbox>
          </div>
        </div>
        {showGlyphbar && <GlyphPalette theme={props.theme} />}
      </div>
    </div>
  );
}
