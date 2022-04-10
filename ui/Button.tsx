import * as React from "react";

import { cx } from "./index";

export type ButtonProps = {
  children: React.ReactChild;
  onClick?: React.MouseEventHandler;
  title?: string;
  active?: boolean;
};

export function Button(props: ButtonProps) {
  return (
    <button
      className={cx("Button", props.active && "Button--active")}
      onClick={props.onClick}
      title={props.title}
    >
      {props.children}
    </button>
  );
}
