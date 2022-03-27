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
};

export function Checkbox(props: CheckboxProps) {
  // prevent stealing focus with onMouseDown
  let onMouseDown: React.MouseEventHandler = (ev) => ev.preventDefault();
  let handleChange: React.ChangeEventHandler = (ev) => {
    props.onValue((ev.target as HTMLInputElement).checked);
  };
  return (
    <label
      className={cx("Checkbox", props.value && "Checkbox--checked")}
      onMouseDown={onMouseDown}
    >
      <input type="checkbox" checked={props.value} onChange={handleChange} />{" "}
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

export function useTheme() {
  let [theme, setTheme] = Base.React.usePersistentState<
    "dark" | "light" | "system"
  >("bqnpad-theme", () => "system");
  React.useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    if (theme === "system") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  let [isDarkMode, setIsDarkMode] = React.useState<null | boolean>(null);
  let isDarkMode0 = Base.React.usePrefersDarkMode(setIsDarkMode, []);
  isDarkMode = isDarkMode ?? isDarkMode0;
  let theme0: "dark" | "light" =
    theme === "system" ? (isDarkMode ? "dark" : "light") : theme;
  return [theme0, theme, setTheme] as const;
}

// TODO: need to infer this from CSS
// line-height (1.4) * fontSize (20)
export const LINE_HEIGHT = 28;
