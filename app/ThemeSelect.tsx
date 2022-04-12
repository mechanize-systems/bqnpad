import * as icons from "@tabler/icons";
import * as React from "react";

import * as Base from "@mechanize/base";
import * as UI from "@mechanize/ui";

let FONTS: UI.SelectOption<UI.ThemePreference>[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export type ThemeSelectProps = {
  themePref: UI.ThemePreference;
  onThemePref: (themePref: UI.ThemePreference) => void;
};

export function ThemeSelect(props: ThemeSelectProps) {
  return (
    <div className="Toolbar__section">
      <div className="ButtonGroup ButtonGroup--toggle">
        <UI.Button
          title="System Theme"
          active={props.themePref === "system"}
          onClick={() => props.onThemePref("system")}
        >
          <icons.IconPoint />
        </UI.Button>
        <UI.Button
          title="Light Theme"
          active={props.themePref === "light"}
          onClick={() => props.onThemePref("light")}
        >
          <icons.IconSun />
        </UI.Button>
        <UI.Button
          title="Dark Theme"
          active={props.themePref === "dark"}
          onClick={() => props.onThemePref("dark")}
        >
          <icons.IconMoon />
        </UI.Button>
      </div>
    </div>
  );
}
