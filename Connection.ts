import * as StableSocket from "@github/stable-socket";

import { deferred } from "./PromiseUtil";
import type { Deferred } from "./PromiseUtil";

export let socket = new StableSocket.BufferedSocket(
  new StableSocket.StableSocket(
    "ws://10.0.88.2:3000/_api/doc",
    {
      socketDidOpen(_socket: StableSocket.Socket) {
        // Socket is ready to write.
      },
      socketDidClose(
        _socket: StableSocket.Socket,
        _code?: number,
        _reason?: string,
      ) {
        // Socket closed and will retry the connection.
      },
      socketDidFinish(_socket: StableSocket.Socket) {
        // Socket closed for good and will not retry.
      },
      socketDidReceiveMessage(_socket: StableSocket.Socket, message: string) {
        let response = JSON.parse(message);
        let deferred = inflight.get(response.reqID);
        if (deferred == null)
          throw new Error(`Orphaned response: ${response.reqID}`);
        deferred.resolve(response.value);
      },
      socketShouldRetry(_socket: StableSocket.Socket, code: number): boolean {
        // Socket reconnects unless server returns the policy violation code.
        return code !== 1008;
      },
    },
    {
      timeout: 4000,
      attempts: Infinity,
      maxDelay: 60000,
    },
  ),
);
socket.open();

let inflight = new Map<number, Deferred<any>>();

export function request<T>(data: unknown): Deferred<T> {
  let reqID = inflight.size;
  let d = deferred<T>();
  inflight.set(reqID, d);
  socket.send(JSON.stringify({ data, reqID }));
  return d;
}
