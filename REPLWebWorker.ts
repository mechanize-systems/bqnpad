import * as WorkerUtil from "@bqnpad/lib/WorkerUtil";

import * as REPL from "./REPL";

let repl = new REPL.REPL();

export type Method = "eval" | "preview";

WorkerUtil.defineWorker<[method: Method, code: string], REPL.REPLResult>(
  (method, code) => {
    if (method === "eval") return repl.eval(code);
    else if (method === "preview") return repl.preview(code);
    else throw new Error(`unknown method: ${method}`);
  },
);
