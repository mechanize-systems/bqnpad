/**
 * Connection class implements request-response protocol on top of a WebSocket
 * transport.
 */
import * as Lib from "@bqnpad/lib";
import * as StableSocket from "@github/stable-socket";

export class Connection {
  private _requests: Map<number, Lib.PromiseUtil.Deferred<any>>;
  private _socket: StableSocket.Socket;

  constructor(
    endpoint: string = makeConnectionURL(),
    policy: StableSocket.SocketPolicy = defaultPolicy,
  ) {
    this._requests = new Map();
    this._socket = new StableSocket.BufferedSocket(
      new StableSocket.StableSocket(
        endpoint,
        {
          socketDidOpen: (_socket: StableSocket.Socket) => {
            // Socket is ready to write.
          },
          socketDidClose: (
            _socket: StableSocket.Socket,
            _code?: number,
            _reason?: string,
          ) => {
            // Socket closed and will retry the connection.
          },
          socketDidFinish: (_socket: StableSocket.Socket) => {
            // Socket closed for good and will not retry.
          },
          socketDidReceiveMessage: (
            _socket: StableSocket.Socket,
            message: string,
          ) => {
            let response = JSON.parse(message);
            let deferred = this._requests.get(response.reqID);
            if (deferred == null)
              throw new Error(`Orphaned response: ${response.reqID}`);
            deferred.resolve(response.value);
          },
          socketShouldRetry: (
            _socket: StableSocket.Socket,
            code: number,
          ): boolean => {
            // Socket reconnects unless server returns the policy violation code.
            return code !== 1008;
          },
        },
        policy,
      ),
    );
  }

  request<T>(data: unknown): Lib.PromiseUtil.Deferred<T> {
    let reqID = this._requests.size;
    let d = Lib.PromiseUtil.deferred<T>();
    this._requests.set(reqID, d);
    this._socket.send(JSON.stringify({ data, reqID }));
    return d;
  }

  open() {
    this._socket.open();
  }

  close() {
    this._socket.close();
  }

  get isOpen() {
    return this._socket.isOpen();
  }
}

export function makeConnectionURL() {
  let protocol = location.protocol === "https:" ? "wss:" : "ws:";
  let origin = location.origin.replace(/^https?:/, protocol);
  return `${origin}/_api/doc`;
}

let defaultPolicy: StableSocket.SocketPolicy = {
  timeout: 4000,
  attempts: Infinity,
  maxDelay: 60000,
};
