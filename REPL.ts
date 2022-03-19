import * as Base from "@mechanize/base";
import * as React from "react";

import * as EditorBQN from "./EditorBQN";
import * as BQN from "./bqn";

export type REPLResult =
  | { type: "ok"; ok: null | string }
  | { type: "error"; error: string }
  | { type: "notice"; notice: string };

export type REPLStatus = "running" | "idle";

export interface IREPL {
  status: REPLStatus | null;
  onStatus: Base.EventEmitter<REPLStatus>;
  eval(code: string): Promise<REPLResult>;
  preview(code: string): Promise<REPLResult>;
}

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
