import { mergeClasses, makeStyles as vanillaMakeStyles } from "@griffel/core";
import type { GriffelStyle } from "@griffel/core";
// @ts-ignore
import { useRenderer } from "@griffel/react/RendererContext.esm";
// @ts-ignore
import { useTextDirection } from "@griffel/react/TextDirectionContext.esm";
import * as React from "react";

export function useStyles<S extends Record<string, GriffelStyle>>(
  spec: S,
  deps: unknown[] = [],
): { [K in keyof S]: string } {
  let dir = useTextDirection();
  let renderer = useRenderer();
  return React.useMemo(() => {
    let getStyles = vanillaMakeStyles(spec);
    return getStyles({ dir, renderer });
  }, deps) as { [K in keyof S]: string };
}

export let cx = mergeClasses;

let padding = {
  paddingLeft: "5px",
  paddingRight: "5px",
  paddingTop: "5px",
  paddingBottom: "5px",
};

export type ButtonProps = {
  children: string;
  onClick?: React.MouseEventHandler;
  title?: string;
};

export function Button(props: ButtonProps) {
  let styles = useStyles({
    root: {
      ...padding,
      fontWeight: "bold",
      backgroundColor: "transparent",
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      "&:hover": {
        backgroundColor: "#DDD",
      },
      "&:active": {
        backgroundColor: "#CCC",
      },
    },
  });
  return (
    <button
      className={styles.root}
      onClick={props.onClick}
      title={props.title}
    >
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
  let styles = useStyles({
    root: {
      ...padding,
      userSelect: "none",
      display: "flex",
      flexDirection: "row",
      alignItems: "baseline",
      "&:hover": {
        backgroundColor: "#DDD",
      },
      "&:active": {
        backgroundColor: "#CCC",
      },
      "& > input": {
        marginRight: "5px",
      },
    },
  });
  let active = React.useRef<null | HTMLElement>(null);
  // prevent stealing focus with onMouseDown
  let onMouseDown: React.MouseEventHandler = (ev) => ev.preventDefault();
  let handleChange: React.ChangeEventHandler = (ev) => {
    props.onValue((ev.target as HTMLInputElement).checked);
  };
  return (
    <label className={styles.root} onMouseDown={onMouseDown}>
      <input type="checkbox" checked={props.value} onChange={handleChange} />{" "}
      {props.children}
    </label>
  );
}
