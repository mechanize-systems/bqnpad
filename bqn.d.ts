export type Value = { readonly __tag: unique symbol };
export default function execute(bqn: string): Value;
export function fmt(value: Value): string;
export function fmtErr(err: Error): string;
export type SysArgs = { readonly __tag: unique symbol };
export let sysargs: SysArgs;
export type REPL = (code: string) => Value;
export function makerepl(sysargs: SysArgs, depth: number): REPL;
export function allowSideEffect(allow: boolean): void;
