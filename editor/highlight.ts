import type * as Language from "@codemirror/language";
import { highlightTree } from "@lezer/highlight";

export function highlight(
  textContent: string,
  language: Language.Language,
  highlight: Language.HighlightStyle,
) {
  let chunks: string[] = [];
  let callback = (
    text: string,
    style: null | string,
    _from: number,
    _to: number,
  ): void => {
    chunks.push(`<span class="${style ?? ""}">${text}</span>`);
  };
  const tree = language.parser.parse(textContent);
  let pos = 0;
  highlightTree(tree, highlight, (from, to, classes) => {
    from > pos && callback(textContent.slice(pos, from), null, pos, from);
    callback(textContent.slice(from, to), classes, from, to);
    pos = to;
  });
  pos != tree.length &&
    callback(textContent.slice(pos, tree.length), null, pos, tree.length);
  return chunks.join("");
}
