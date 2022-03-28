import * as Base from "@mechanize/base";

import * as REPL from "./REPL";

let repl = new REPL.REPL();

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
