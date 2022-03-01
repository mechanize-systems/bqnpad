import * as React from "react";

export { default as cx } from "classnames";

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
