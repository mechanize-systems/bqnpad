import * as React from "react";

import { cx } from "./index";

export type ButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
  title?: string;
  active?: boolean;
  style?: React.CSSProperties;
};

export function Button(props: ButtonProps) {
  return (
    <button
      className={cx("Button", props.active && "Button--active")}
      style={props.style}
      onClick={props.onClick}
      title={props.title}
    >
      {props.children}
    </button>
  );
}
