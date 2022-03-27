import * as Base from "@mechanize/base";

import * as REPL from "./REPL";

let repl = new REPL.REPL();

export type Methods = {
  eval: (code: string) => Promise<REPL.REPLResult>;
  preview: (code: string) => Promise<REPL.REPLResult>;
  listSys: () => Promise<REPL.ValueDesc[]>;
};

Base.Worker.defineWorker<Methods>({
  eval: (code: string) => repl.eval(code),
  preview: (code: string) => repl.preview(code),
  listSys: () => repl.listSys(),
});
