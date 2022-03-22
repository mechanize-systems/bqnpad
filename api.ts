import type { Update } from "@codemirror/collab";
import { ChangeSet, Text } from "@codemirror/state";
import debug from "debug";
import type * as http from "http";
import ws from "ws";

import * as API from "@mechanize/asap/api";

import type * as Workspace0 from "./Workspace0";

let log = debug("bqnpad:api");

let wss = new ws.Server({ noServer: true });

const INITIAL_DOC = `
# Hello, this is collaborative BQN REPL
"Hello, "∾<⟜'a'⊸/ "Big Questions Notation"
`.trim();

type Sync<V, U> = {
  value: V;
  updates: U[];
  pending: ((value: any) => void)[];
};

let doc: Sync<Text, Update> = {
  value: Text.of(INITIAL_DOC.split("\n")),
  updates: [],
  pending: [],
};

export type WorkspaceUpdate = {
  type: "AddCell";
  clientID: string;
  cell: Workspace0.WorkspaceCell0;
};

let workspace: Sync<Workspace0.Workspace0, WorkspaceUpdate> = {
  value: { cells: [], current: Text.of([""]) as any } as any,
  updates: [],
  pending: [],
};

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
        if (data.version < doc.updates.length)
          resp(doc.updates.slice(data.version));
        else doc.pending.push(resp);
      } else if (data.type == "pushUpdates") {
        if (data.version != doc.updates.length) {
          resp(false);
        } else {
          for (let update of data.updates) {
            // Convert the JSON representation to an actual ChangeSet
            // instance
            let changes = ChangeSet.fromJSON(update.changes);
            doc.updates.push({ changes, clientID: update.clientID });
            doc.value = changes.apply(doc.value);
          }
          resp(true);
          // Notify pending requests
          while (doc.pending.length) doc.pending.pop()!(data.updates);
        }
      } else if (data.type == "pullWorkspaceUpdates") {
        if (data.version < workspace.updates.length)
          resp(workspace.updates.slice(data.version));
        else workspace.pending.push(resp);
      } else if (data.type == "pushWorkspaceUpdates") {
        if (data.version != doc.updates.length) {
          resp(false);
        } else {
          for (let update of data.updates) {
            workspace.value.cells.push(update.cell);
            workspace.updates.push(update);
          }
          resp(true);
          while (workspace.pending.length)
            workspace.pending.pop()!(data.updates);
        }
      } else if (data.type == "initial") {
        resp({
          doc: {
            version: doc.updates.length,
            doc: doc.value.toString(),
          },
          workspace: {
            version: doc.updates.length,
            workspace: workspace.value,
          },
        });
      } else {
        log(`unknown message: ${data.type}`);
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
