import * as Lib from "@bqnpad/lib";
import * as React from "react";

import type { IREPL, REPLResult, REPLStatus } from "./REPL";
import type { Method } from "./REPLWebWorker";

export class REPLWebWorkerClient implements IREPL {
  private inflght: number = 0;

  private inflghtInc() {
    this.inflght += 1;
    if (this.inflght === 1) this.onStatus.fire(this.status);
  }
  private inflghtDec() {
    this.inflght -= 1;
    if (this.inflght === 0) this.onStatus.fire(this.status);
  }

  get status(): REPLStatus {
    return this.inflght === 0 ? "idle" : "running";
  }

  onStatus = new Lib.EventEmitter<REPLStatus>();

  async eval(code: string) {
    this.inflghtInc();
    let res = await bqnWorker.submit("eval", code);
    this.inflghtDec();
    if (res.type === "error") throw res.error;
    return res.value;
  }
  async preview(code: string) {
    this.inflghtInc();
    let res = await bqnWorker.submit("preview", code);
    this.inflghtDec();
    if (res.type === "error") throw res.error;
    return res.value;
  }
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

let bqnWorker = new Lib.WorkerUtil.WorkerManager<
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
