import * as Autocomplete from "@codemirror/autocomplete";
import * as Commands from "@codemirror/commands";
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

  let view = React.useRef<null | View.EditorView>(null);
  let runCommand =
    (cmd: View.Command): React.MouseEventHandler =>
    (ev) => {
      ev.preventDefault();
      if (!view.current!.hasFocus) view.current!.focus();
      cmd(view.current!);
    };
  let elem = React.useRef<null | HTMLDivElement>(null);
  let darkThemeExtension = Editor.useReact2Editor(view, theme === "dark", [
    theme,
  ]);

  let notebookId = "*scratch*";
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

  let [{ undoDepth, redoDepth }, trackState] = Editor.useEditor2React(
    { undoDepth: 0, redoDepth: 0 },
    (state) => ({
      undoDepth: Commands.undoDepth(state),
      redoDepth: Commands.redoDepth(state),
    }),
  );

  Editor.useEditor(
    elem,
    view,
    () => {
      let sysCompletion = (ns: string | null, state: State.EditorState) => {
        let repl = NotebookKernel.NotebookREPL.get(state).repl;
        if (ns != null) return repl.listNs(ns);
        else return repl.listSys();
      };
      let [doc, cellSet] = NotebookKernel.decode(notebook.doc);
      let state = State.EditorState.create({
        doc,
        extensions: [
          View.keymap.of(NotebookKernel.keymap),
          View.keymap.of([{ key: "Tab", run: Autocomplete.startCompletion }]),
          View.keymap.of(Commands.historyKeymap),
          View.keymap.of(Commands.defaultKeymap),
          NotebookKernel.configure(),
          Commands.history(),
          LangBQN.bqn({ sysCompletion }),
          Language.indentOnInput(),
          darkThemeExtension,
          View.EditorView.darkTheme.from(darkThemeExtension),
          Autocomplete.closeBrackets(),
          Editor.scrollMarginBottom(150),
          View.EditorView.updateListener.of(onUpdate),
          trackState,
        ],
      });
      state = NotebookKernel.cells.setCellSet(state, cellSet);
      return state;
    },
    [notebook, onUpdate, darkThemeExtension, trackState],
  );
  React.useLayoutEffect(() => {
    view.current!.focus();
  }, [view]);

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
            <>
              <div className="ButtonGroup">
                <UI.Button
                  disabled={undoDepth === 0}
                  title="Undo (Mod-z)"
                  onMouseDown={runCommand(Commands.undo)}
                >
                  <icons.IconArrowBackUp />
                </UI.Button>
                <UI.Button
                  disabled={redoDepth === 0}
                  title="Redo (Mod-Shift-z) "
                  onMouseDown={runCommand(Commands.redo)}
                >
                  <icons.IconArrowForwardUp />
                </UI.Button>
              </div>
              <div className="ButtonGroup">
                <UI.Button
                  title="Insert cell (Mod+Enter)"
                  onMouseDown={runCommand(NotebookKernel.commands.insertAfter)}
                >
                  <icons.IconPlus />
                </UI.Button>
                <UI.Button
                  title="Run till the current cell (Shift+Enter)"
                  onMouseDown={runCommand(NotebookKernel.commands.runCurrent)}
                >
                  <icons.IconPlayerPlay />
                </UI.Button>
                <UI.Button
                  title="Run all (Shift+Alt+Enter)"
                  onMouseDown={runCommand(NotebookKernel.commands.runAll)}
                >
                  <icons.IconPlayerSkipForward />
                </UI.Button>
              </div>
              <ThemeSelect themePref={themePref} onThemePref={setThemePref} />
            </>
          }
        />
        <div style={{ width: "100%", height: "100%" }}>
          <div className="Editor" ref={elem} />
        </div>
      </div>
    </Chrome.Chrome>
  );
}
