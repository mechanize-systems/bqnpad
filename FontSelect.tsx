import * as Base from "@mechanize/base";
import * as React from "react";

let FONTS = [
  { fontFamily: "BQN", label: "BQN386" },
  { fontFamily: "Iosevka", label: "Iosevka" },
  { fontFamily: "BQNMod", label: "DejaVu Sans mono" },
  { fontFamily: "FFHD", label: "Fairfax HD" },
  { fontFamily: "JuliaMono", label: "Julia Mono" },
  { fontFamily: "f3270", label: "3270" },
];
let DEFAULT_FONT = "BQN";

let fontCodec: Base.React.Codec<string> = {
  encode: (font) => font,
  decode: (font) =>
    FONTS.some((f) => f.fontFamily === font) ? font : DEFAULT_FONT,
};

export function FontSelect() {
  let [currentFont, setCurrentFont] = Base.React.usePersistentState(
    "bqnpad-pref-font",
    () => DEFAULT_FONT,
    fontCodec,
  );
  React.useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--editor-font-family",
      `${currentFont}, Menlo, Monaco, monospace`,
    );
    document.documentElement.style.setProperty(
      "--ui-font-family",
      `${currentFont}, Menlo, Monaco, monospace`,
    );
  }, [currentFont]);
  let options = FONTS.map((font) => (
    <option key={font.fontFamily} value={font.fontFamily}>
      {font.label}
    </option>
  ));
  let onChange: React.FormEventHandler = (ev) =>
    setCurrentFont((ev.target as HTMLSelectElement).value);
  return (
    <>
      <div className="label">Font: </div>
      <select value={currentFont} onChange={onChange} className="Select">
        {options}
      </select>
    </>
  );
}
