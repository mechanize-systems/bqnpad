import {
  Update,
  collab,
  getSyncedVersion,
  receiveUpdates,
  sendableUpdates,
} from "@codemirror/collab";
import { defaultKeymap } from "@codemirror/commands";
import { ChangeSet, EditorState, Text } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap } from "@codemirror/view";
import * as React from "react";

import * as Connection from "./Connection";
import BQN, { fmt } from "./bqn";

export type EditorProps = {
  doc: Text;
  version: number;
};

function evalBQNFromText(text: Text) {
  let bqn = text.sliceString(0);
  try {
    return fmt(BQN(bqn));
  } catch {
    return "oops";
  }
}

export function Editor({ doc, version }: EditorProps) {
  let ref = React.useRef<null | HTMLDivElement>(null);
  let view = React.useRef<null | EditorView>(null);
  let [output, setOutput] = React.useState<null | string>(() =>
    evalBQNFromText(doc),
  );
  React.useEffect(() => {
    let listener = EditorView.updateListener.of((update) => {
      if (update.docChanged) setOutput(evalBQNFromText(update.state.doc));
    });
    let startState = EditorState.create({
      doc,
      extensions: [keymap.of(defaultKeymap), peerExtension(version), listener],
    });
    view.current = new EditorView({
      state: startState,
      parent: document.body,
    });

    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, []);
  return (
    <div>
      <div ref={ref} />
      <pre>{output}</pre>
    </div>
  );
}

function peerExtension(startVersion: number) {
  let plugin = ViewPlugin.fromClass(
    class {
      private pushing = false;
      private done = false;

      constructor(private view: EditorView) {
        this.pull();
      }

      update(update: ViewUpdate) {
        if (update.docChanged) this.push();
      }

      async push() {
        let updates = sendableUpdates(this.view.state);
        if (this.pushing || !updates.length) return;
        this.pushing = true;
        let version = getSyncedVersion(this.view.state);
        await pushUpdates(version, updates);
        this.pushing = false;
        // Regardless of whether the push failed or new updates came in
        // while it was running, try again if there's updates remaining
        if (sendableUpdates(this.view.state).length)
          setTimeout(() => this.push(), 100);
      }

      async pull() {
        while (!this.done) {
          let version = getSyncedVersion(this.view.state);
          let updates = await pullUpdates(version);
          this.view.dispatch(receiveUpdates(this.view.state, updates));
        }
      }

      destroy() {
        this.done = true;
      }
    },
  );
  return [collab({ startVersion }), plugin];
}

function pushUpdates(
  version: number,
  fullUpdates: readonly Update[],
): Promise<boolean> {
  // Strip off transaction data
  let updates = fullUpdates.map((u) => ({
    clientID: u.clientID,
    changes: u.changes.toJSON(),
  }));
  return Connection.request<boolean>({ type: "pushUpdates", version, updates })
    .promise;
}

async function pullUpdates(version: number): Promise<readonly Update[]> {
  let updates = await Connection.request<
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

export async function getDocument(): Promise<{
  version: number;
  doc: Text;
}> {
  let data = await Connection.request<{ version: number; doc: string }>({
    type: "getDocument",
  });
  return {
    version: data.version,
    doc: Text.of(data.doc.split("\n")),
  };
}
