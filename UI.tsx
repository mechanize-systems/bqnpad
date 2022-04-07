import { default as cx } from "classnames";
import * as React from "react";

import * as Base from "@mechanize/base";

export { cx };

export function setEditorFont(font: string) {
  document.documentElement.style.setProperty(
    "--editor-font-family",
    `${font}, Menlo, Monaco, monospace`,
  );
}

export type ButtonProps = {
  children: string;
  onClick?: React.MouseEventHandler;
  title?: string;
};

export function Button(props: ButtonProps) {
  return (
    <button className="Button" onClick={props.onClick} title={props.title}>
      {props.children}
    </button>
  );
}

export type CheckboxProps = {
  children: string;
  value: boolean;
  onValue: (value: boolean) => void;
  disabled?: boolean;
  title?: string;
};

export function Checkbox(props: CheckboxProps) {
  // prevent stealing focus with onMouseDown
  let onMouseDown: React.MouseEventHandler = (ev) => ev.preventDefault();
  let handleChange: React.ChangeEventHandler = (ev) => {
    props.onValue((ev.target as HTMLInputElement).checked);
  };
  return (
    <label
      className={cx(
        "Checkbox",
        props.value && "Checkbox--checked",
        props.disabled && "Checkbox--disabled",
      )}
      onMouseDown={onMouseDown}
      title={props.title}
    >
      <input
        type="checkbox"
        disabled={props.disabled}
        checked={props.value}
        onChange={handleChange}
      />{" "}
      {props.children}
    </label>
  );
}

export type SelectProps<S extends string = string> = {
  value: S;
  onValue: (value: S) => void;
  options: SelectOption<S>[];
};

export type SelectOption<S extends string = string> = {
  value: S;
  label: string;
};

export function Select<S extends string = string>(props: SelectProps<S>) {
  let onChange: React.FormEventHandler = (ev) =>
    props.onValue((ev.target as HTMLSelectElement).value as S);
  let options = props.options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));
  return (
    <select value={props.value} onChange={onChange} className="Select">
      {options}
    </select>
  );
}

export type Theme = "dark" | "light";
export type ThemePreference = Theme | "system";

export function useTheme() {
  let [themePref, setThemePref] =
    Base.React.usePersistentState<ThemePreference>(
      "bqnpad-theme",
      () => "system",
    );
  React.useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    if (themePref === "system") return;
    document.documentElement.setAttribute("data-theme", themePref);
  }, [themePref]);
  let isDarkMode = useIsDarkMode();
  let theme: Theme =
    themePref === "system" ? (isDarkMode ? "dark" : "light") : themePref;
  return [theme, themePref, setThemePref] as const;
}

export function useIsDarkMode() {
  let [isDarkMode, setIsDarkMode] = React.useState<null | boolean>(null);
  let isDarkMode0 = Base.React.usePrefersDarkMode(setIsDarkMode, []);
  return isDarkMode ?? isDarkMode0;
}

// TODO: need to infer this from CSS
// line-height (1.4) * fontSize (20)
export const LINE_HEIGHT = 28;
