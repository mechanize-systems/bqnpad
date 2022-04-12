import * as React from "react";

import { cx } from "./index";

export type ButtonProps = {
  children: React.ReactNode;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, active, ...props }: ButtonProps) {
  let className = cx("Button", active && "Button--active", props.className);
  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
}
