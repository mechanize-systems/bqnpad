import * as React from "react";

import * as Base from "@mechanize/base";

import { CBQNREPL } from "./CBQNREPL";
import { IREPL, REPL } from "./REPL";
import { REPLWebWorkerClient } from "./REPLWebWorkerClient";

export type {
  IREPL,
  REPLResult,
  REPLStatus,
  REPLEffect,
  REPLOutput,
  ValueDesc,
} from "./REPL";
export { REPL, useREPLStatus } from "./REPL";
export { CBQNREPL } from "./CBQNREPL";
export { REPLWebWorkerClient } from "./REPLWebWorkerClient";

export type REPLType = "bqnjs" | "cbqn";

export function makeREPL(type: REPLType = "bqnjs"): IREPL {
  if (Base.Worker.supportsWorkerModule()) {
    return new REPLWebWorkerClient(type);
  } else {
    // Those browsers (looking at you, Firefox) which don't support WebWorker
    // type=module will get in process REPL.
    //
    // - Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
    switch (type) {
      case "bqnjs":
        return new REPL();
        break;
      case "cbqn":
        return new CBQNREPL();
      default:
        Base.never(type);
    }
  }
}

export function useREPL(type: REPLType = "bqnjs") {
  return React.useMemo(() => makeREPL(type), [type]);
}
