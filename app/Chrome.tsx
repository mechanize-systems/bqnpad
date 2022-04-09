import * as React from "react";

import * as ASAP from "@mechanize/asap";

export function Chrome({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(() => {
    document.title = "BQNPAD";
  }, []);
  return <React.Suspense fallback={<AppLoading />}>{children}</React.Suspense>;
}

export function AppLoading(_props: ASAP.AppLoadingProps) {
  return <div className="AppLoading">Loading...</div>;
}
