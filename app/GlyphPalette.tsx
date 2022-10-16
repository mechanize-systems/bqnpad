import * as LangBQN from "lang-bqn";
import * as React from "react";

import * as UI from "@mechanize/ui";

export type GlyphPaletteProps = {
  theme: "dark" | "light";
  onGlyph?: (glyph: LangBQN.Glyph) => void;
};

export function GlyphPalette({
  theme,
  onGlyph = onGlyphDefault,
}: GlyphPaletteProps) {
  let hi = theme === "dark" ? LangBQN.highlightDark : LangBQN.highlightLight;
  let chars = React.useMemo(() => {
    return LangBQN.glyphs.map((glyph) => {
      let className = hi.style([glyph.tag]) ?? undefined;
      let title =
        glyph.title + "\n\n" + (glyph.key ? `\\-${glyph.key}` : glyph.glyph);
      return (
        <button
          title={title}
          key={glyph.glyph}
          onMouseDown={(ev) => {
            ev.preventDefault();
            onGlyph(glyph);
          }}
          className={UI.cx(className, "GlyphsPalette__item")}
        >
          {glyph.glyph}
        </button>
      );
    });
  }, [hi, onGlyph]);
  return (
    <div className="GlyphsPalette">
      <div className="GlyphsPalette__inner">{chars}</div>
    </div>
  );
}

let onGlyphDefault = (glyph: LangBQN.Glyph) => {
  document.execCommand("insertText", false, glyph.glyph);
};
