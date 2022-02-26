export type Result<V, E = string> =
  | { type: "ok"; value: V }
  | { type: "error"; error: E };

export function ok<V, E>(value: V): Result<V, E> {
  return { type: "ok", value };
}

export function error<V, E>(error: E): Result<V, E> {
  return { type: "error", error };
}
