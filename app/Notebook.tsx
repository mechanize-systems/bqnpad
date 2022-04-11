import * as Autocomplete from "@codemirror/autocomplete";
import * as CloseBrackets from "@codemirror/closebrackets";
import * as Commands from "@codemirror/commands";
import * as History from "@codemirror/history";
import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as LangBQN from "lang-bqn";
import * as React from "react";

import * as Base from "@mechanize/base";
import * as Editor from "@mechanize/editor";
import * as UI from "@mechanize/ui";

import * as AppHeader from "./AppHeader";
import * as Chrome from "./Chrome";
import { FontSelect } from "./FontSelect";
import * as NotebookKernel from "./NotebookKernel";
import * as NotebookManager from "./NotebookManager";
import { ThemeSelect } from "./ThemeSelect";

let manager = NotebookManager.makeLocalStorageManager();

export default function Notebook() {
  let [theme, themePref, setThemePref] = UI.useTheme();
  return (
    <Chrome.Chrome>
      <div className="Notebook">
        <AppHeader.AppHeader
          theme={theme}
          toolbar={
            <div className="Toolbar__section">
              <FontSelect />
            </div>
          }
          iconbar={
            <ThemeSelect themePref={themePref} onThemePref={setThemePref} />
          }
        />
        <NotebookEditor theme={theme} notebookId="*scratch*" />
      </div>
    </Chrome.Chrome>
  );
}

type NotebookEditorProps = {
  theme: UI.Theme;
  notebookId: string;
};

function NotebookEditor({ theme, notebookId }: NotebookEditorProps) {
  let editorElement = React.useRef<null | HTMLDivElement>(null);
  let editor = React.useRef<null | View.EditorView>(null);
  let darkThemeExtension = Editor.useStateField(editor, theme === "dark", [
    theme,
  ]);

  let notebook = React.useMemo(
    () => manager.loadNotebook(notebookId).getOrSuspend(),
    [notebookId],
  );
  let [onNotebook, onNotebookFlush] = Base.React.useDebouncedCallback(
    700,
    (getDoc: () => string) => {
      let doc = getDoc();
      manager.saveNotebook({ meta: { id: notebook.meta.id }, doc });
    },
    [notebook.meta.id],
  );
  React.useEffect(() => onNotebookFlush, [onNotebookFlush]);

  Editor.useEditor(
    editorElement,
    editor,
    () => {
      let kernel = NotebookKernel.configure({
        notebook: notebook.doc,
        onNotebook,
      });
      return State.EditorState.create({
        doc: kernel.doc,
        extensions: [
          View.keymap.of(kernel.keymap),
          View.keymap.of([{ key: "Tab", run: Autocomplete.startCompletion }]),
          View.keymap.of(History.historyKeymap),
          View.keymap.of(Commands.defaultKeymap),
          kernel.extension,
          History.history(),
          LangBQN.bqn(),
          Language.indentOnInput(),
          darkThemeExtension,
          View.EditorView.darkTheme.from(darkThemeExtension),
          CloseBrackets.closeBrackets(),
          Editor.scrollMarginBottom(150),
        ],
      });
    },
    [notebook, onNotebook, darkThemeExtension],
  );
  React.useLayoutEffect(() => {
    editor.current!.focus();
  }, []);
  return <div className="Editor" ref={editorElement} />;
}
