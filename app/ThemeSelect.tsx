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
    <>
      <div className="label">Theme: </div>
      <UI.Select
        value={props.themePref}
        onValue={props.onThemePref}
        options={FONTS}
      />
    </>
  );
}
