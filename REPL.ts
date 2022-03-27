import * as React from "react";

import * as Base from "@mechanize/base";

import * as BQN from "./bqn";

export type REPLResult =
  | { type: "ok"; ok: null | string }
  | { type: "error"; error: string }
  | { type: "notice"; notice: string };

export type REPLStatus = "running" | "idle";

export interface IREPL {
  status: REPLStatus | null;
  onStatus: Base.EventEmitter<REPLStatus>;
  listSys(): Promise<ValueDesc[]>;
  eval(code: string): Promise<REPLResult>;
  preview(code: string): Promise<REPLResult>;
}

export type ValueDesc = {
  name: string;
  type: ValueType;
};

export type ValueType =
  | "array"
  | "number"
  | "character"
  | "function"
  | "1-modifier"
  | "2-modifier"
  | "namespace";

let valueTypes: { [code: number]: ValueType } = {
  0: "array",
  1: "number",
  2: "character",
  3: "function",
  4: "1-modifier",
  5: "2-modifier",
  6: "namespace",
};

const FMTLIMIT = 5000;

export class REPL implements IREPL {
  private repl: BQN.REPL;
  ready: Promise<unknown>;

  onStatus = new Base.EventEmitter<REPLStatus>();
  status = null;

  constructor() {
    this.repl = BQN.makerepl(BQN.sysargs, 1);
    this.ready = Promise.resolve(null);
  }

  listSys() {
    let code = `{𝕩 ⋈⟜•Type¨ •BQN 1↓∾"‿•"⊸∾¨𝕩} •listSys`;
    let res = this.ready.then(() => {
      let value = this.repl(code) as any as [string[], number][];
      return value.map(([name, type]) => ({
        name: name.join(""),
        type: valueTypes[type]!,
      }));
    });
    this.ready = res;
    return res;
  }

  eval(code: string): Promise<REPLResult> {
    let res = this.ready.then((): REPLResult => {
      if (code.trim().length === 0) return { type: "ok", ok: null };
      try {
        let value = this.repl(code);
        return { type: "ok", ok: BQN.fmt(value).slice(0, FMTLIMIT) };
      } catch (e) {
        return { type: "error", error: BQN.fmtErr(e as any) };
      }
    });
    this.ready = res;
    return res;
  }

  preview(code: string): Promise<REPLResult> {
    let res = this.ready.then((): REPLResult => {
      if (code.trim().length === 0) return { type: "ok", ok: null };

      try {
        let value = this.repl.preview(code);
        return { type: "ok", ok: BQN.fmt(value).slice(0, FMTLIMIT) };
      } catch (e) {
        if ((e as any).kind === "previewError")
          return {
            type: "notice",
            notice:
              "cannot preview this expression as it produces side effects, submit expression (Shift+Enter) to see its result",
          };
        return { type: "error", error: BQN.fmtErr(e as any) };
      }
    });
    this.ready = res;
    return res;
  }
}

export function useREPLStatus(repl: IREPL): REPLStatus | null {
  let [status, setStatus0] = React.useState<REPLStatus | null>(repl.status);
  let [setStatus] = Base.React.useDebouncedCallback(1, setStatus0);
  React.useLayoutEffect(
    () => repl.onStatus.subscribe(setStatus),
    [repl, setStatus],
  );
  return status;
}
