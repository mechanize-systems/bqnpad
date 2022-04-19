import * as icons from "@tabler/icons";
import * as React from "react";

import * as Base from "@mechanize/base";
import * as UI from "@mechanize/ui";

import { GlyphPalette } from "./GlyphPalette";
import { Logo } from "./Logo";

export type AppHeaderProps = {
  status?: React.ReactNode;
  toolbar?: React.ReactNode;
  iconbar?: React.ReactNode;
  theme: UI.Theme;
};

export function AppHeader(props: AppHeaderProps) {
  let [collapsed, setCollapsed] = Base.React.usePersistentState(
    "bqnpad-appheader-collapsed",
    () => false,
  );
  let toggleCollapsed = () => setCollapsed((collapsed) => !collapsed);
  return (
    <div className={UI.cx("AppHeader", collapsed && "AppHeader--collapsed")}>
      <div className="Toolbar">
        <div style={{ display: "flex" }}>
          <UI.Button onClick={toggleCollapsed}>
            <Logo size={24} />
          </UI.Button>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <a
              className="title Button"
              href={window.location.origin}
              style={{ color: "#2b7067" }}
            >
              BQNPAD
            </a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {props.iconbar}
          <UI.Button
            title={collapsed ? "Expand toolbar" : "Collapse toolbar"}
            onClick={toggleCollapsed}
          >
            {collapsed ? <icons.IconMenu2 /> : <icons.IconX />}
          </UI.Button>
        </div>
      </div>
      <div className="AppHeader__hideable">
        <div className="Toolbar" style={{ justifyContent: "space-between" }}>
          <div className={UI.cx("AppHeader__topRight", "AppHeader__hideable")}>
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
            {props.status}
          </div>
          {props.toolbar}
        </div>
        <GlyphPalette theme={props.theme} />
      </div>
    </div>
  );
}
