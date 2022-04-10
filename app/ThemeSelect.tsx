import * as React from "react";

import * as Base from "@mechanize/base";
import * as UI from "@mechanize/ui";

import Icon from "./Icon";

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
    <>
      <div className="ButtonGroup">
        <UI.Button
          active={props.themePref === "system"}
          onClick={() => props.onThemePref("system")}
        >
          <Icon icon="gear" />
        </UI.Button>
        <UI.Button
          active={props.themePref === "light"}
          onClick={() => props.onThemePref("light")}
        >
          <Icon icon="sun" />
        </UI.Button>
        <UI.Button
          active={props.themePref === "dark"}
          onClick={() => props.onThemePref("dark")}
        >
          <Icon icon="moon" />
        </UI.Button>
      </div>
    </>
  );
}
