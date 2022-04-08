import { default as cx } from "classnames";
import * as React from "react";

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
