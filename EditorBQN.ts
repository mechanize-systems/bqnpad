/**
 * Editor support for BQN.
 */
import { parser } from "@bqnpad/grammar";
import { HighlightStyle, Tag, styleTags } from "@codemirror/highlight";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";

let tags = {
  BQNstring: Tag.define(),
  BQNnumber: Tag.define(),
  BQNnothing: Tag.define(),
  BQNparen: Tag.define(),
  BQNdelim: Tag.define(),
  BQNlist: Tag.define(),
  BQNblock: Tag.define(),
  BQNfun: Tag.define(),
  BQNmod1: Tag.define(),
  BQNmod2: Tag.define(),
  BQNcomment: Tag.define(),
};

export let highlight = HighlightStyle.define([
  { tag: tags.BQNstring, color: "#3e99ab" },
  { tag: tags.BQNnumber, color: "#a73227" },
  { tag: tags.BQNnothing, color: "#a73227" },
  { tag: tags.BQNparen, color: "#5a524a" },
  { tag: tags.BQNdelim, color: "#9c7dc1" },
  { tag: tags.BQNlist, color: "#9c7dc1" },
  { tag: tags.BQNblock, color: "#862f9e" },
  { tag: tags.BQNfun, color: "#3aa548" },
  { tag: tags.BQNmod1, color: "#93428b" },
  { tag: tags.BQNmod2, color: "#998819" },
  { tag: tags.BQNcomment, color: "#3f3daa" },
]);

let bqnStyleTags = styleTags({
  COMMENT: tags.BQNcomment,
  STRING: tags.BQNstring,
  CHAR: tags.BQNstring,
  NULL: tags.BQNstring,
  NUMBER: tags.BQNnumber,
  NOTHING: tags.BQNnothing,
  PAREN: tags.BQNparen,
  DELIM: tags.BQNdelim,
  STRIDE: tags.BQNdelim,
  LIST: tags.BQNlist,
  BLOCK: tags.BQNblock,
  FUN: tags.BQNfun,
  PRIMFUN: tags.BQNfun,
  SYSFUN: tags.BQNfun,
  SPECFUN: tags.BQNfun,
  MOD1: tags.BQNmod1,
  PRIMMOD1: tags.BQNmod1,
  SYSMOD1: tags.BQNmod1,
  MOD2: tags.BQNmod2,
  PRIMMOD2: tags.BQNmod2,
  SYSMOD2: tags.BQNmod2,
  SPECMOD2: tags.BQNmod2,
});

export let language = LRLanguage.define({
  parser: parser.configure({
    props: [bqnStyleTags],
  }),
  languageData: {
    commentTokens: { line: "#" },
    indentOnInput: /^\s*(\]|\}|\))/,
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`"] },
  },
});

export type Glyph = { glyph: string; tag: Tag | null };
export let keys: [string, Glyph][] = [
  ["`", { glyph: "˜", tag: tags.BQNmod1 }],
  ["1", { glyph: "˘", tag: tags.BQNmod1 }],
  ["2", { glyph: "¨", tag: tags.BQNmod1 }],
  ["3", { glyph: "⁼", tag: tags.BQNmod1 }],
  ["4", { glyph: "⌜", tag: tags.BQNmod1 }],
  ["5", { glyph: "´", tag: tags.BQNmod1 }],
  ["6", { glyph: "˝", tag: tags.BQNmod1 }],
  ["8", { glyph: "∞", tag: tags.BQNnumber }],
  ["9", { glyph: "¯", tag: tags.BQNnumber }],
  ["0", { glyph: "•", tag: null }],
  ["-", { glyph: "÷", tag: tags.BQNfun }],
  ["=", { glyph: "×", tag: tags.BQNfun }],
  ["~", { glyph: "¬", tag: tags.BQNfun }],
  ["!", { glyph: "⎉", tag: tags.BQNmod2 }],
  ["@", { glyph: "⚇", tag: tags.BQNmod2 }],
  ["#", { glyph: "⍟", tag: tags.BQNmod2 }],
  ["$", { glyph: "◶", tag: tags.BQNmod2 }],
  ["%", { glyph: "⊘", tag: tags.BQNmod2 }],
  ["^", { glyph: "⎊", tag: tags.BQNmod2 }],
  ["(", { glyph: "⟨", tag: tags.BQNlist }],
  [")", { glyph: "⟩", tag: tags.BQNlist }],
  ["_", { glyph: "√", tag: tags.BQNfun }],
  ["+", { glyph: "⋆", tag: tags.BQNfun }],
  ["q", { glyph: "⌽", tag: tags.BQNfun }],
  ["w", { glyph: "𝕨", tag: null }],
  ["e", { glyph: "∊", tag: tags.BQNfun }],
  ["r", { glyph: "↑", tag: tags.BQNfun }],
  ["t", { glyph: "∧", tag: tags.BQNfun }],
  ["u", { glyph: "⊔", tag: tags.BQNfun }],
  ["i", { glyph: "⊏", tag: tags.BQNfun }],
  ["o", { glyph: "⊐", tag: tags.BQNfun }],
  ["p", { glyph: "π", tag: tags.BQNnumber }],
  ["[", { glyph: "←", tag: null }],
  ["]", { glyph: "→", tag: null }],
  ["W", { glyph: "𝕎", tag: tags.BQNfun }],
  ["E", { glyph: "⍷", tag: tags.BQNfun }],
  ["R", { glyph: "𝕣", tag: tags.BQNmod2 }],
  ["T", { glyph: "⍋", tag: tags.BQNfun }],
  ["I", { glyph: "⊑", tag: tags.BQNfun }],
  ["O", { glyph: "⊒", tag: tags.BQNfun }],
  ["{", { glyph: "⊣", tag: tags.BQNfun }],
  ["}", { glyph: "⊢", tag: tags.BQNfun }],
  ["a", { glyph: "⍉", tag: tags.BQNfun }],
  ["s", { glyph: "𝕤", tag: null }],
  ["d", { glyph: "↕", tag: tags.BQNfun }],
  ["f", { glyph: "𝕗", tag: null }],
  ["g", { glyph: "𝕘", tag: null }],
  ["h", { glyph: "⊸", tag: tags.BQNmod2 }],
  ["j", { glyph: "∘", tag: tags.BQNmod2 }],
  ["k", { glyph: "○", tag: tags.BQNmod2 }],
  ["l", { glyph: "⟜", tag: tags.BQNmod2 }],
  [";", { glyph: "⋄", tag: tags.BQNlist }],
  ["'", { glyph: "↩", tag: null }],
  ["S", { glyph: "𝕊", tag: tags.BQNfun }],
  ["F", { glyph: "𝔽", tag: tags.BQNfun }],
  ["G", { glyph: "𝔾", tag: tags.BQNfun }],
  ["H", { glyph: "«", tag: tags.BQNfun }],
  ["K", { glyph: "⌾", tag: tags.BQNmod2 }],
  ["L", { glyph: "»", tag: tags.BQNfun }],
  [",", { glyph: "·", tag: tags.BQNnothing }],
  ["z", { glyph: "⥊", tag: tags.BQNfun }],
  ['"', { glyph: "˙", tag: tags.BQNmod1 }],
  ["x", { glyph: "𝕩", tag: null }],
  ["c", { glyph: "↓", tag: tags.BQNfun }],
  ["v", { glyph: "∨", tag: tags.BQNfun }],
  ["b", { glyph: "⌊", tag: tags.BQNfun }],
  ["m", { glyph: "≡", tag: tags.BQNfun }],
  [",", { glyph: "∾", tag: tags.BQNfun }],
  [".", { glyph: "≍", tag: tags.BQNfun }],
  ["/", { glyph: "≠", tag: tags.BQNfun }],
  ["Z", { glyph: "⋈", tag: tags.BQNfun }],
  ["X", { glyph: "𝕏", tag: tags.BQNfun }],
  ["V", { glyph: "⍒", tag: tags.BQNfun }],
  ["B", { glyph: "⌈", tag: tags.BQNfun }],
  ["M", { glyph: "≢", tag: tags.BQNfun }],
  ["<", { glyph: "≤", tag: tags.BQNfun }],
  [">", { glyph: "≥", tag: tags.BQNfun }],
  ["?", { glyph: "⇐", tag: tags.BQNfun }],
  [" ", { glyph: "‿", tag: tags.BQNlist }],
];
export let keymap: Map<string, Glyph> = new Map(keys);

function bqnKeymap(): State.Extension {
  let expecting: NodeJS.Timeout | null = null;

  let resetExpecting = () => {
    if (expecting != null) {
      clearTimeout(expecting);
      expecting = null;
    }
  };

  let scheduleExpecting = () => {
    resetExpecting();
    expecting = setTimeout(() => {
      expecting = null;
    }, 500);
  };

  let manageExpecting = View.ViewPlugin.fromClass(
    class {
      destroy() {
        resetExpecting();
      }
    },
  );

  let transactionFilter = State.EditorState.transactionFilter.of((tr) => {
    if (!tr.isUserEvent("input")) return [tr] as State.TransactionSpec[];

    let pos = null as
      | { type: "expect" }
      | { type: "input"; from: number; to: number; ch: string }
      | null;

    tr.changes.iterChanges((fa, ta, _fb, _tb, ins) => {
      if (ins.length !== 1) return;
      let ch = ins.sliceString(0);
      if (ch === "\\") {
        pos = { type: "expect" };
      } else if (
        tr.startState.doc.sliceString(fa - 1, ta) === "\\" &&
        expecting != null
      ) {
        resetExpecting();
        pos = { type: "input", from: fa - 1, to: ta, ch };
      }
    });

    if (pos?.type === "expect") {
      scheduleExpecting();
    } else if (pos?.type === "input") {
      let insert = keymap.get(pos.ch);
      if (insert != null)
        return {
          changes: { from: pos.from, to: pos.to, insert: insert.glyph },
        } as State.TransactionSpec;
    }
    return [tr] as State.TransactionSpec[];
  });

  return [transactionFilter, manageExpecting];
}

/**
 * Configure extension for BQN.
 */
export function bqn() {
  let extensions: State.Extension[] = [highlight, bqnKeymap()];
  return new LanguageSupport(language, extensions);
}
