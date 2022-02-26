import { EventEmitter } from "@bqnpad/lib/EventEmitter";
import * as ReactUtil from "@bqnpad/lib/ReactUtil";
import * as WorkerUtil from "@bqnpad/lib/WorkerUtil";
import * as React from "react";

import type { IREPL, REPLResult } from "./REPL";
import type { Method } from "./REPLWebWorker";

type REPLStatus = "running" | "idle";

export class REPLWebWorkerClient implements IREPL {
  onStatus = new EventEmitter<REPLStatus>();

  private inflght: number = 0;

  get status(): REPLStatus {
    return this.inflght === 0 ? "idle" : "running";
  }

  async eval(code: string) {
    this.inflght += 1;
    if (this.inflght === 1) {
      this.onStatus.fire(this.status);
    }
    let res = await bqnWorker.submit("eval", code);
    this.inflght -= 1;
    if (this.inflght === 0) this.onStatus.fire(this.status);
    if (res.type === "error") throw res.error;
    return res.value;
  }
  async preview(code: string) {
    this.inflght += 1;
    if (this.inflght === 1) this.onStatus.fire(this.status);
    let res = await bqnWorker.submit("preview", code);
    this.inflght -= 1;
    if (this.inflght === 0) this.onStatus.fire(this.status);
    if (res.type === "error") throw res.error;
    return res.value;
  }
}

export function useREPLStatus(repl: REPLWebWorkerClient) {
  let [status, setStatus0] = React.useState<REPLStatus>(repl.status);
  let [setStatus] = ReactUtil.useDebouncedCallback(1, setStatus0);
  React.useEffect(() => repl.onStatus.subscribe(setStatus), [repl, setStatus]);
  return status;
}

// NOTE: Below compileWorker implements a very hacky way to acquire
// LangJavascriptWorker chunk URL and instantiate a Worker instance.
//
// Hopefully once https://github.com/evanw/esbuild/issues/312 is solver we can
// remove that horrible piece of code.
// @ts-ignore
let _loadWorker = () => import("./REPLWebWorker");

declare var ASAPConfig: { basePath: string };

let BASENAME_RE =
  /^(?:\/?|)(?:[\s\S]*?)((?:\.{1,2}|[^\/]+?|)(?:\.[^.\/]*|))(?:[\/]*)$/;

let bqnWorker = new WorkerUtil.WorkerManager<
  [method: Method, code: string],
  REPLResult,
  Error
>(async () => {
  let resp = await fetch(ASAPConfig.basePath + "/__static/metafile.json");
  let json = await resp.json();
  for (let out in json.outputs) {
    let m = BASENAME_RE.exec(out);
    if (m == null) continue;
    let basename = m[1];
    if (
      !(
        basename &&
        basename.startsWith("REPLWebWorker") &&
        basename.endsWith(".js")
      )
    )
      continue;
    let url = `${ASAPConfig.basePath}/__static/${basename}`;
    return new Worker(url, { type: "module" });
  }
  return new Worker(new URL("./REPLWebWorker", import.meta.url));
});
