import * as React from "react";

import * as EditorBQN from "./EditorBQN";
import * as UI from "./UI";

export type GlyphsPaletteProps = {
  onClick: (glyph: EditorBQN.Glyph) => void;
};

export function GlyphsPalette({ onClick }: GlyphsPaletteProps) {
  let styles = UI.useStyles({
    root: {
      display: "flex",
      flexDirection: "row",
      fontSize: "20px",
      width: "100%",
      flexWrap: "wrap",
    },
    item: {
      backgroundColor: "transparent",
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      paddingLeft: "5px",
      paddingRight: "5px",
      paddingTop: "5px",
      paddingBottom: "5px",
      "&:hover": {
        backgroundColor: "#DDD",
      },
      "&:active": {
        backgroundColor: "#CCC",
      },
    },
  });
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
          className={UI.cx(styles.item, className)}
        >
          {glyph.glyph}
        </button>
      );
    });
  }, [onClick]);
  return <div className={styles.root}>{chars}</div>;
}
