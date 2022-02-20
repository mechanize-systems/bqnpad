import * as ASAP from "@mechanize/asap";
import * as React from "react";

import { Editor, getDocument } from "./Editor";
import { suspendable } from "./PromiseUtil";

export let routes = {
  index: ASAP.route("/", async () => ({ default: Index })),
};

ASAP.boot({ routes });

let docLoading = suspendable(getDocument());

function Index() {
  let { doc, version } = docLoading.getOrSuspend();
  return (
    <div>
      <Editor doc={doc} version={version} />
    </div>
  );
}
