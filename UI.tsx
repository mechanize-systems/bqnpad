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
