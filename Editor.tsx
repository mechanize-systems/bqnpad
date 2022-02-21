import {
  collab,
  getSyncedVersion,
  receiveUpdates,
  sendableUpdates,
} from "@codemirror/collab";
import { defaultKeymap } from "@codemirror/commands";
import { EditorState, Text } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate, keymap } from "@codemirror/view";
import * as React from "react";

import type { DocumentConnection } from "./DocumentConnection";
import BQN, { fmt } from "./bqn";

export type EditorProps = {
  conn: DocumentConnection;
};

function evalBQNFromText(text: Text) {
  let bqn = text.sliceString(0);
  try {
    return fmt(BQN(bqn));
  } catch {
    return "oops";
  }
}

export function Editor({ conn }: EditorProps) {
  let { doc, version } = conn.initialDocument().getOrSuspend();
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
      extensions: [
        keymap.of(defaultKeymap),
        peerExtension(conn, version),
        listener,
      ],
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

function peerExtension(conn: DocumentConnection, startVersion: number) {
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
        await conn.pushUpdates(version, updates);
        this.pushing = false;
        // Regardless of whether the push failed or new updates came in
        // while it was running, try again if there's updates remaining
        if (sendableUpdates(this.view.state).length)
          setTimeout(() => this.push(), 100);
      }

      async pull() {
        while (!this.done) {
          let version = getSyncedVersion(this.view.state);
          let updates = await conn.pullUpdates(version);
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
