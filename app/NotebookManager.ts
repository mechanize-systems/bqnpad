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
          read(key(id), () => ({ meta: { id }, doc: "" })),
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
