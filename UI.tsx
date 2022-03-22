import * as React from "react";

export { default as cx } from "classnames";

export function setEditorFont(font: string) {
  document.documentElement.style.setProperty(
    "--editor-font-family",
    `${font}, Menlo, Monaco, monospace`,
  );
}

export function setUIFont(font: string) {
  document.documentElement.style.setProperty(
    "--ui-font-family",
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
    <label className="Checkbox" onMouseDown={onMouseDown}>
      <input type="checkbox" checked={props.value} onChange={handleChange} />{" "}
      {props.children}
    </label>
  );
}

export type SelectProps = {
  value: string;
  onValue: (value: string) => void;
  options: SelectOption[];
};

export type SelectOption = { value: string; label: string };

export function Select(props: SelectProps) {
  let onChange: React.FormEventHandler = (ev) =>
    props.onValue((ev.target as HTMLSelectElement).value);
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
