import type { Update } from "@codemirror/collab";
import { ChangeSet, Text } from "@codemirror/state";
import * as API from "@mechanize/asap/api";
import debug from "debug";
import type * as http from "http";
import ws from "ws";

let log = debug("bqnpad:api");

let wss = new ws.Server({ noServer: true });

const INITIAL_DOC = `
# Hello, this is collaborative BQN REPL
"Hello, "∾<⟜'a'⊸/ "Big Questions Notation"
`.trim();

let updates: Update[] = [];
let doc = Text.of(INITIAL_DOC.split("\n"));
let pending: ((value: any) => void)[] = [];

export let routes = [
  API.route("GET", "/doc", async (req, _res) => {
    let conn = await upgradeConnection(req);
    log("client connected");

    conn.onclose = () => {
      log("client disconnected");
    };
    conn.onmessage = (event: ws.MessageEvent) => {
      let { data, reqID } = JSON.parse(event.data.toString());
      let resp = (value: any) => conn.send(JSON.stringify({ reqID, value }));
      if (data.type == "pullUpdates") {
        if (data.version < updates.length) resp(updates.slice(data.version));
        else pending.push(resp);
      } else if (data.type == "pushUpdates") {
        if (data.version != updates.length) {
          resp(false);
        } else {
          for (let update of data.updates) {
            // Convert the JSON representation to an actual ChangeSet
            // instance
            let changes = ChangeSet.fromJSON(update.changes);
            updates.push({ changes, clientID: update.clientID });
            doc = changes.apply(doc);
          }
          resp(true);
          // Notify pending requests
          while (pending.length) pending.pop()!(data.updates);
        }
      } else if (data.type == "getDocument") {
        resp({ version: updates.length, doc: doc.toString() });
      }
    };
  }),
];

function upgradeConnection(req: http.IncomingMessage): Promise<ws.WebSocket> {
  return new Promise((resolve) => {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit("connection", ws, req);
      resolve(ws);
    });
  });
}
