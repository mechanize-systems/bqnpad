import * as Base from "@mechanize/base";

import * as CBQNREPL from "./CBQNREPL";
import * as REPL from "./REPL";
import type { REPLType } from "./index";

let vm = (new URL(self.location.href).searchParams.get("vm") ??
  "bqnjs") as REPLType;

let repl: REPL.IREPL;
switch (vm) {
  case "bqnjs":
    repl = new REPL.REPL();
    break;
  case "cbqn":
    repl = new CBQNREPL.CBQNREPL();
    break;
  default:
    Base.never(vm);
}

export type Methods = {
  eval: REPL.IREPL["eval"];
  preview: REPL.IREPL["preview"];
  listSys: REPL.IREPL["listSys"];
};

Base.Worker.defineWorker<Methods>({
  eval: (code: string) => repl.eval(code),
  preview: (code: string) => repl.preview(code),
  listSys: () => repl.listSys(),
});
