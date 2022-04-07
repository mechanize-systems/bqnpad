import * as React from "react";

import * as Base from "@mechanize/base";

import type * as BQN from "./bqn";

export type REPLResult =
  | { type: "ok"; ok: null | string }
  | { type: "error"; error: string }
  | { type: "notice"; notice: string };

export type REPLStatus = "running" | "idle";

export interface IREPL {
  status: REPLStatus | null;
  onStatus: Base.EventEmitter<REPLStatus>;
  listSys(): Promise<ValueDesc[]>;
  eval(code: string): Promise<readonly [REPLResult, string[]]>;
  preview(code: string): Promise<readonly [REPLResult, string[]]>;
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

const LOGS: string[] = [];

declare global {
  interface Window {
    bqnShow(v: string): void;
  }
}
self.bqnShow = (v: string) => LOGS.push(v);

let consumeLogs = (): string[] => {
  let logs = LOGS.slice(0);
  LOGS.length = 0;
  return logs;
};

export class REPL implements IREPL {
  private _BQN: Promise<{ repl: BQN.REPL; BQN: typeof BQN }>;
  private _ready: Promise<any>;

  onStatus = new Base.EventEmitter<REPLStatus>();
  status = null;

  constructor() {
    this._BQN = (
      import("./bqn") as any as Promise<{ default: typeof BQN }>
    ).then(({ default: BQN }) => {
      return {
        repl: BQN.makerepl(BQN.sysargs, 1),
        BQN,
      };
    });
    this._ready = this._BQN;
  }

  BQN(): Promise<{ repl: BQN.REPL; BQN: typeof BQN }> {
    let ready = this._ready;
    return this._BQN.then(async (BQN) => {
      await ready;
      return BQN;
    });
  }

  listSys() {
    let code = `{𝕩 ⋈⟜•Type¨ •BQN 1↓∾"‿•"⊸∾¨𝕩} •listSys`;
    let res = this.BQN().then((BQN) => {
      let value = BQN.repl(code) as any as [string[], number][];
      return value.map(([name, type]) => ({
        name: name.join(""),
        type: valueTypes[type]!,
      }));
    });
    this._ready = res;
    return res;
  }

  eval(code: string): Promise<readonly [REPLResult, string[]]> {
    let res = this.BQN().then((BQN) => {
      if (code.trim().length === 0)
        return [{ type: "ok", ok: null }, [] as string[]] as const;
      try {
        let value = BQN.repl(code);
        let logs = consumeLogs();
        return [
          { type: "ok", ok: BQN.BQN.fmt(value).slice(0, FMTLIMIT) },
          logs,
        ] as const;
      } catch (e) {
        let logs = consumeLogs();
        return [
          { type: "error", error: BQN.BQN.fmtErr(e as any) },
          logs,
        ] as const;
      }
    });
    this._ready = res;
    return res;
  }

  preview(code: string): Promise<readonly [REPLResult, string[]]> {
    let res = this.BQN().then((BQN) => {
      if (code.trim().length === 0)
        return [{ type: "ok", ok: null }, [] as string[]] as const;

      try {
        let value = BQN.repl.preview(code);
        let logs = consumeLogs();
        return [
          { type: "ok", ok: BQN.BQN.fmt(value).slice(0, FMTLIMIT) },
          logs,
        ] as const;
      } catch (e) {
        let logs = consumeLogs();
        if ((e as any).kind === "previewError")
          return [
            {
              type: "notice",
              notice:
                "cannot preview this expression as it produces side effects, submit expression (Shift+Enter) to see its result",
            },
            logs,
          ] as const;
        return [
          { type: "error", error: BQN.BQN.fmtErr(e as any) },
          logs,
        ] as const;
      }
    });
    this._ready = res;
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
