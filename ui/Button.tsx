import * as React from "react";

import { cx } from "./index";

export type ButtonProps = {
  children: React.ReactNode;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, active, disabled, ...props }: ButtonProps) {
  let className = cx(
    "Button",
    active && "Button--active",
    disabled && "Button--disabled",
    props.className,
  );
  return (
    <button {...props} className={className} disabled={disabled}>
      {children}
    </button>
  );
}
