import * as Autocomplete from "@codemirror/autocomplete";
import * as CloseBrackets from "@codemirror/closebrackets";
import * as Commands from "@codemirror/commands";
import * as History from "@codemirror/history";
import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as icons from "@tabler/icons";
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
  let view = React.useRef<null | View.EditorView>(null);
  let runCommand =
    (cmd: View.Command): React.MouseEventHandler =>
    (ev) => {
      ev.preventDefault();
      if (!view.current!.hasFocus) view.current!.focus();
      cmd(view.current!);
    };
  let elem = React.useRef<null | HTMLDivElement>(null);
  let darkThemeExtension = Editor.useStateField(view, theme === "dark", [
    theme,
  ]);

  let notebook = React.useMemo(
    () => manager.loadNotebook(notebookId).getOrSuspend(),
    [notebookId],
  );
  let [onUpdate, onUpdateFlush] = Base.React.useDebouncedCallback(
    700,
    (update: View.ViewUpdate) => {
      let doc = NotebookKernel.encode(update.state);
      manager.saveNotebook({ meta: { id: notebook.meta.id }, doc });
    },
    [notebook.meta.id],
  );
  React.useEffect(() => onUpdateFlush, [onUpdateFlush]);

  Editor.useEditor(
    elem,
    view,
    () => {
      let [doc, cellSet] = NotebookKernel.decode(notebook.doc);
      let state = State.EditorState.create({
        doc,
        extensions: [
          View.keymap.of(NotebookKernel.keymap),
          View.keymap.of([{ key: "Tab", run: Autocomplete.startCompletion }]),
          View.keymap.of(History.historyKeymap),
          View.keymap.of(Commands.defaultKeymap),
          NotebookKernel.configure(),
          History.history(),
          LangBQN.bqn(),
          Language.indentOnInput(),
          darkThemeExtension,
          View.EditorView.darkTheme.from(darkThemeExtension),
          CloseBrackets.closeBrackets(),
          Editor.scrollMarginBottom(150),
          View.EditorView.updateListener.of(onUpdate),
        ],
      });
      state = NotebookKernel.cells.setCellSet(state, cellSet);
      return state;
    },
    [notebook, onUpdate, darkThemeExtension],
  );
  React.useLayoutEffect(() => {
    view.current!.focus();
  }, [view]);
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div className="Toolbar EditorToolbar">
        <div className="Toolbar__section">
          <div className="ButtonGroup">
            <UI.Button onMouseDown={runCommand(History.undo)}>
              <icons.IconArrowBackUp />
            </UI.Button>
            <UI.Button onMouseDown={runCommand(History.redo)}>
              <icons.IconArrowForwardUp />
            </UI.Button>
          </div>
          <div className="ButtonGroup">
            <UI.Button
              onMouseDown={runCommand(NotebookKernel.commands.insertAfter)}
            >
              <icons.IconPlus />
            </UI.Button>
            <UI.Button
              onMouseDown={runCommand(NotebookKernel.commands.runCurrent)}
            >
              <icons.IconPlayerPlay />
            </UI.Button>
            <UI.Button
              color="dimmed"
              onMouseDown={runCommand(NotebookKernel.commands.runAll)}
            >
              <icons.IconPlayerSkipForward />
            </UI.Button>
          </div>
        </div>
      </div>
      <div className="Editor" ref={elem} />
    </div>
  );
}
