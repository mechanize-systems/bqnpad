import * as React from "react";

import * as Base from "@mechanize/base";

export type NotebookMeta = {
  id: string;
};
export type Notebook = {
  meta: NotebookMeta;
  doc: string;
};

export type NotebookManager = {
  listNotebook(): Base.Promise.Suspendable<NotebookMeta[]>;
  loadNotebook(notebookId: string): Base.Promise.Suspendable<Notebook>;
  saveNotebook(notebook: Notebook): Promise<void>;
};

export function makeLocalStorageManager(): NotebookManager {
  function read<T>(key: string, init: () => T): T {
    let s: string | null = localStorage.getItem(key);
    if (s == null) return init();
    try {
      return JSON.parse(s);
    } catch (_e) {
      return init();
    }
  }
  let listKey = "bqnpad.notebook";
  let key = (id: string) => `bqnpad.notebook.${id}`;
  let list = Base.Promise.suspendable<NotebookMeta[]>(() =>
    read(listKey, () => []),
  );
  let load: Map<
    NotebookMeta["id"],
    Base.Promise.Suspendable<Notebook>
  > = new Map();
  return {
    listNotebook() {
      return list();
    },
    loadNotebook(id: string) {
      let p = load.get(id);
      if (p == null) {
        p = Base.Promise.suspendable(() =>
          read(key(id), () => ({ meta: { id }, doc: INITIAL_DOC })),
        )();
        load.set(id, p);
      }
      return p;
    },
    async saveNotebook(notebook: Notebook) {
      let ns = await list();
      ns = ns.map((m) => (m.id === notebook.meta.id ? notebook.meta : m));
      localStorage.setItem(listKey, JSON.stringify(ns));
      localStorage.setItem(key(notebook.meta.id), JSON.stringify(notebook));
      load.delete(notebook.meta.id);
      list = Base.Promise.suspendable(() => read(listKey, () => []));
    },
  };
}

const INITIAL_DOC = `
Dist←{√+´2⋆˜𝕨-𝕩} # Let's define Euclidian Distance, how it works?
###
4‿4-3‿2 # 𝕨-𝕩 is obviously subtraction
###
2⋆˜4 # 2⋆˜𝕩 computes square of 𝕩, same as 𝕩⋆2 but 𝕗˜ reverses agruments of 𝕗
###
+´1‿2‿3‿4 # +´𝕩 computes sum of the 𝕩 vector, 𝕗´ is a fold with 𝕗
###
2‿2 Dist 3‿3 # finally we compute Euclidian Distance
###
# Now let's do some plots, first prepare some data
x←0.1×↕250
cos←•math.Cos x
sin←•math.Sin x
###
# Use •plot namespace and specifically •plot.Line to plot some trig functions
x •plot.Line (1.5×cos)∾sin∾cos≍sin×cos,
`.trim();
