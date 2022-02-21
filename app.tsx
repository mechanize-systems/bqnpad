import * as ASAP from "@mechanize/asap";
import * as React from "react";

import { useDocumentConnection } from "./DocumentConnection";
import { Surface } from "./Editor";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
};

ASAP.boot({ routes });

function Index() {
  let conn = useDocumentConnection();
  return (
    <div>
      <React.Suspense fallback={<div>Loading...</div>}>
        <Surface conn={conn} />
      </React.Suspense>
    </div>
  );
}
