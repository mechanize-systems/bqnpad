import * as ASAP from "@mechanize/asap";
import * as React from "react";

import { useDocumentConnection } from "./DocumentConnection";
import { Surface } from "./Editor";
import "./app.css";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
};

ASAP.boot({ routes, AppLoading });

function Index() {
  let conn = useDocumentConnection();
  return (
    <React.Suspense fallback={<AppLoading />}>
      <Surface conn={conn} />
    </React.Suspense>
  );
}

function AppLoading(_props: ASAP.AppLoadingProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      Loading...
    </div>
  );
}
