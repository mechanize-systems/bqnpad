import * as React from "react";

import * as Base from "@mechanize/base";

export type Theme = "dark" | "light";

export type ThemePreference = Theme | "system";

export function useTheme() {
  let [themePref, setThemePref] =
    Base.React.usePersistentState<ThemePreference>(
      "bqnpad-theme",
      () => "system",
    );
  React.useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    if (themePref === "system") return;
    document.documentElement.setAttribute("data-theme", themePref);
  }, [themePref]);
  let isDarkMode = useIsDarkMode();
  let theme: Theme =
    themePref === "system" ? (isDarkMode ? "dark" : "light") : themePref;
  return [theme, themePref, setThemePref] as const;
}

export function useIsDarkMode() {
  let [isDarkMode, setIsDarkMode] = React.useState<null | boolean>(null);
  let isDarkMode0 = Base.React.usePrefersDarkMode(setIsDarkMode, []);
  return isDarkMode ?? isDarkMode0;
}
