import * as React from "react";

import * as Base from "@mechanize/base";

import * as REPL from "./REPL";

const FMTLIMIT = 10000;

function fmt(s: string) {
  if (s.length > FMTLIMIT) s = s.slice(0, FMTLIMIT);
  return s;
}

type CBQN = {
  eval(code: string): void;
  consumeStdout(): string[];
  consumeStderr(): string[];
};

async function loadCBQN(): Promise<CBQN> {
  let { default: make } = await import("./CBQN");
  let stdout: string[] = [];
  let stderr: string[] = [];
  let mod = await make({
    print(msg: string) {
      stdout.push(msg);
    },
    printErr(msg: string) {
      stderr.push(msg);
    },
  });
  return {
    eval: mod.cwrap("cbqn_runLine", null, ["string"]),
    consumeStdout: () => {
      let s = stdout;
      stdout = [];
      return s;
    },
    consumeStderr: () => {
      let s = stderr;
      stderr = [];
      return s;
    },
  };
}

export class CBQNREPL implements REPL.IREPL {
  private _CBQN: Promise<CBQN>;
  private _ready: Promise<any>;

  onStatus = new Base.EventEmitter<REPL.REPLStatus>();
  status = null;

  constructor() {
    this._CBQN = loadCBQN();
    this._ready = this._CBQN;
  }

  CBQN(): Promise<CBQN> {
    let ready = this._ready;
    return this._CBQN.then(async (CBQN) => {
      await ready;
      return CBQN;
    });
  }

  async listSys() {
    return [];
  }

  eval(code: string): Promise<readonly [REPL.REPLResult, string[]]> {
    let res = this.CBQN().then((CBQN) => {
      if (code.trim().length === 0)
        return [{ type: "ok", ok: null }, [] as string[]] as const;
      try {
        CBQN.eval(code);
        let stdout = CBQN.consumeStdout();
        let stderr = CBQN.consumeStderr();
        if (stderr.length > 0) {
          let error = String(stderr.join("\n"));
          if (error === "Error: Empty program")
            return [{ type: "ok", ok: null }, stdout.map(fmt)] as const;
          else return [{ type: "error", error }, stdout.map(fmt)] as const;
        }
        let ok = stdout.join("\n");
        return [{ type: "ok", ok: fmt(ok) }, [] as string[]] as const;
      } catch (e) {
        let stderr = CBQN.consumeStderr();
        return [
          { type: "error", error: String(stderr.join("\n")) },
          [] as string[],
        ] as const;
      }
    });
    this._ready = res;
    return res;
  }

  async preview(_code: string): Promise<readonly [REPL.REPLResult, string[]]> {
    return [{ type: "notice", notice: "..." }, []];
  }
}
