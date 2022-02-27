import * as Collab from "@codemirror/collab";
import type * as State from "@codemirror/state";
import * as View from "@codemirror/view";

import type { WorkspaceConnection } from "./WorkspaceConnection";

export function peerExtension(
  conn: WorkspaceConnection,
  startVersion: number,
): State.Extension {
  let plugin = View.ViewPlugin.fromClass(
    class {
      private pushing = false;
      private done = false;

      constructor(private view: View.EditorView) {
        this.pull();
      }

      update(update: View.ViewUpdate) {
        if (update.docChanged) this.push();
      }

      async push() {
        let updates = Collab.sendableUpdates(this.view.state);
        if (this.pushing || !updates.length) return;
        this.pushing = true;
        let version = Collab.getSyncedVersion(this.view.state);
        await conn.pushUpdates(version, updates);
        this.pushing = false;
        // Regardless of whether the push failed or new updates came in
        // while it was running, try again if there's updates remaining
        if (Collab.sendableUpdates(this.view.state).length)
          setTimeout(() => this.push(), 100);
      }

      async pull() {
        while (!this.done) {
          let version = Collab.getSyncedVersion(this.view.state);
          let updates = await conn.pullUpdates(version);
          this.view.dispatch(Collab.receiveUpdates(this.view.state, updates));
        }
      }

      destroy() {
        this.done = true;
      }
    },
  );
  return [Collab.collab({ startVersion, clientID: conn.clientID }), plugin];
}
