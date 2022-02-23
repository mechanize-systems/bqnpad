import type { Update } from "@codemirror/collab";
import { ChangeSet, Text } from "@codemirror/state";
import { nanoid } from "nanoid";
import * as React from "react";

import { Connection } from "./Connection";
import { suspendable } from "./PromiseUtil";
import type { Suspendable } from "./PromiseUtil";
import type { Workspace, WorkspaceUpdate } from "./api";

class WorkspaceConnection {
  clientID: string;
  private conn: Connection;
  initial: () => Suspendable<{
    doc: {
      version: number;
      doc: Text;
    };
    workspace: {
      version: number;
      workspace: Workspace;
    };
  }>;

  constructor() {
    this.conn = new Connection();
    this.clientID = nanoid();
    this.initial = suspendable(() => this._initial());
  }

  open() {
    this.conn.open();
  }

  close() {
    this.conn.close();
  }

  private async _initial(): Promise<{
    doc: {
      version: number;
      doc: Text;
    };
    workspace: {
      version: number;
      workspace: Workspace;
    };
  }> {
    let data = await this.conn.request<{
      doc: {
        version: number;
        doc: string;
      };
      workspace: {
        version: number;
        workspace: Workspace;
      };
    }>({
      type: "initial",
    });
    console.log(data);
    return {
      doc: {
        version: data.doc.version,
        doc: Text.of(data.doc.doc.split("\n")),
      },
      workspace: data.workspace,
    };
  }

  pushWorkspaceUpdates(updates: readonly WorkspaceUpdate[]): Promise<boolean> {
    return this.conn.request<boolean>({
      type: "pushWorkspaceUpdates",
      updates,
    }).promise;
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

export type { WorkspaceConnection };

export function useWorkspaceConnection(): WorkspaceConnection {
  let conn = React.useMemo(() => new WorkspaceConnection(), []);
  React.useEffect(() => {
    conn.open();
    return () => {
      conn.close();
    };
  }, [conn]);
  return conn;
}
