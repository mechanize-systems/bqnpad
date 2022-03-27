import * as LangBQN from "lang-bqn";
import * as React from "react";

import * as UI from "./UI";

export type GlyphsPaletteProps = {
  theme: "dark" | "light";
  onClick: (glyph: LangBQN.Glyph) => void;
};

export function GlyphsPalette({ theme, onClick }: GlyphsPaletteProps) {
  let hi = theme === "dark" ? LangBQN.highlightDark : LangBQN.highlight;
  console.log(hi, theme);
  let chars = React.useMemo(() => {
    return LangBQN.glyphs.map((glyph) => {
      let className =
        glyph.tag != null
          ? hi.match(glyph.tag, null as any) ?? undefined
          : undefined;
      let title =
        glyph.title + "\n\n" + (glyph.key ? `\\-${glyph.key}` : glyph.glyph);
      return (
        <button
          title={title}
          key={glyph.glyph}
          onClick={() => onClick(glyph)}
          className={UI.cx(className, "GlyphsPalette__item")}
        >
          {glyph.glyph}
        </button>
      );
    });
  }, [hi, onClick]);
  return <div className="GlyphsPalette">{chars}</div>;
}
