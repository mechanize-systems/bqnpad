import * as Autocomplete from "@codemirror/autocomplete";
import * as CloseBrackets from "@codemirror/closebrackets";
import * as Commands from "@codemirror/commands";
import * as History from "@codemirror/history";
import * as Language from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import * as LangBQN from "lang-bqn";
import * as React from "react";

import * as Editor from "@mechanize/editor";
import * as UI from "@mechanize/ui";

import * as AppHeader from "./AppHeader";
import * as Chrome from "./Chrome";
import { FontSelect } from "./FontSelect";
import * as NotebookKernel from "./NotebookKernel";
import { ThemeSelect } from "./ThemeSelect";

export default function Notebook() {
  let [theme, themePref, setThemePref] = UI.useTheme();
  let toolbar = (
    <div className="Toolbar__section">
      <FontSelect />
    </div>
  );

  let iconbar = (
    <>
      <ThemeSelect themePref={themePref} onThemePref={setThemePref} />
    </>
  );

  return (
    <Chrome.Chrome>
      <div className="Notebook">
        <AppHeader.AppHeader
          theme={theme}
          toolbar={toolbar}
          iconbar={iconbar}
        />
        <NotebookEditor theme={theme} />
      </div>
    </Chrome.Chrome>
  );
}

type NotebookEditorProps = {
  theme: UI.Theme;
};

function NotebookEditor({ theme }: NotebookEditorProps) {
  let editorElement = React.useRef<null | HTMLDivElement>(null);
  let editor = React.useRef<null | View.EditorView>(null);
  let darkThemeExtension = Editor.useStateField(editor, theme === "dark", [
    theme,
  ]);
  let kernel = React.useMemo(() => NotebookKernel.configure(), []);
  Editor.useEditor(editorElement, editor, {
    doc: State.Text.of([""]),
    extensions: React.useMemo(
      () => [
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
      [darkThemeExtension, kernel],
    ),
  });
  React.useLayoutEffect(() => {
    editor.current!.focus();
  }, []);

  return <div className="Editor" ref={editorElement} />;
}
