import * as React from "react";

import * as EditorBQN from "lang-bqn";
import * as UI from "./UI";

export type GlyphsPaletteProps = {
  onClick: (glyph: EditorBQN.Glyph) => void;
};

export function GlyphsPalette({ onClick }: GlyphsPaletteProps) {
  let chars = React.useMemo(() => {
    return EditorBQN.glyphs.map((glyph) => {
      let className =
        glyph.tag != null
          ? EditorBQN.highlight.match(glyph.tag, null as any) ?? undefined
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
  }, [onClick]);
  return <div className="GlyphsPalette">{chars}</div>;
}
