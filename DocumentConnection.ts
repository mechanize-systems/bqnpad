import type { Update } from "@codemirror/collab";
import { ChangeSet, Text } from "@codemirror/state";
import * as React from "react";

import { Connection } from "./Connection";
import { suspendable } from "./PromiseUtil";
import type { Suspendable } from "./PromiseUtil";

class DocumentConnection {
  private conn: Connection;
  initialDocument: () => Suspendable<{ version: number; doc: Text }>;

  constructor() {
    this.conn = new Connection();
    this.initialDocument = suspendable(() => this.getDocument());
  }

  open() {
    this.conn.open();
  }

  close() {
    this.conn.close();
  }

  private async getDocument(): Promise<{ version: number; doc: Text }> {
    let data = await this.conn.request<{ version: number; doc: string }>({
      type: "getDocument",
    });
    return {
      version: data.version,
      doc: Text.of(data.doc.split("\n")),
    };
  }

  pushUpdates(
    version: number,
    fullUpdates: readonly Update[],
  ): Promise<boolean> {
    // Strip off transaction data
    let updates = fullUpdates.map((u) => ({
      clientID: u.clientID,
      changes: u.changes.toJSON(),
    }));
    return this.conn.request<boolean>({
      type: "pushUpdates",
      version,
      updates,
    }).promise;
  }

  async pullUpdates(version: number): Promise<readonly Update[]> {
    let updates = await this.conn.request<
      { changes: unknown; clientID: string }[]
    >({
      type: "pullUpdates",
      version,
    });
    return updates.map((u) => ({
      changes: ChangeSet.fromJSON(u.changes),
      clientID: u.clientID,
    }));
  }
}

export type { DocumentConnection };

export function useDocumentConnection(): DocumentConnection {
  let conn = React.useMemo(() => new DocumentConnection(), []);
  React.useEffect(() => {
    conn.open();
    return () => {
      conn.close();
    };
  }, [conn]);
  return conn;
}
