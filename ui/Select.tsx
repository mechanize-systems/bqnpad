import * as React from "react";

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
