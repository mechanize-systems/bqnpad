import * as React from "react";

import * as Base from "@mechanize/base";
import * as UI from "@mechanize/ui";

let FONTS: UI.SelectOption[] = [
  { value: "BQN", label: "BQN386" },
  { value: "Iosevka", label: "Iosevka" },
  { value: "BQNMod", label: "DejaVu Sans mono" },
  { value: "FFHD", label: "Fairfax HD" },
  { value: "JuliaMono", label: "Julia Mono" },
  { value: "f3270", label: "3270" },
];
let DEFAULT_FONT = "BQN";

let fontCodec: Base.React.Codec<string> = {
  encode: (font) => font,
  decode: (font) =>
    FONTS.some((f) => f.value === font) ? font : DEFAULT_FONT,
};

export function FontSelect() {
  let [currentFont, setCurrentFont] = Base.React.usePersistentState(
    "bqnpad-pref-font",
    () => DEFAULT_FONT,
    fontCodec,
  );
  React.useLayoutEffect(() => {
    setEditorFont(currentFont);
  }, [currentFont]);
  return (
    <>
      <div className="label">Font: </div>
      <UI.Select
        value={currentFont}
        onValue={setCurrentFont}
        options={FONTS}
      />
    </>
  );
}

function setEditorFont(font: string) {
  document.documentElement.style.setProperty(
    "--app-font-family-monospace",
    `${font}, Menlo, Monaco, monospace`,
  );
}
