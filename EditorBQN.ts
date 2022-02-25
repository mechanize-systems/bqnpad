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

export type Glyph = {
  glyph: string;
  key: string | null;
  tag: Tag | null;
};

export let glyphs: Glyph[] = [
  { glyph: "+", tag: tags.BQNfun, key: null },
  { glyph: "-", tag: tags.BQNfun, key: null },
  { glyph: "×", tag: tags.BQNfun, key: "=" },
  { glyph: "÷", tag: tags.BQNfun, key: "-" },
  { glyph: "⋆", tag: tags.BQNfun, key: "+" },
  { glyph: "√", tag: tags.BQNfun, key: "_" },
  { glyph: "⌊", tag: tags.BQNfun, key: "b" },
  { glyph: "⌈", tag: tags.BQNfun, key: "B" },
  { glyph: "∧", tag: tags.BQNfun, key: "t" },
  { glyph: "∨", tag: tags.BQNfun, key: "v" },
  { glyph: "¬", tag: tags.BQNfun, key: "~" },
  { glyph: "|", tag: tags.BQNfun, key: null },
  { glyph: "≤", tag: tags.BQNfun, key: "<" },
  { glyph: "<", tag: tags.BQNfun, key: null },
  { glyph: ">", tag: tags.BQNfun, key: null },
  { glyph: "≥", tag: tags.BQNfun, key: ">" },
  { glyph: "=", tag: tags.BQNfun, key: null },
  { glyph: "≠", tag: tags.BQNfun, key: "/" },
  { glyph: "≡", tag: tags.BQNfun, key: "m" },
  { glyph: "≢", tag: tags.BQNfun, key: "M" },
  { glyph: "⊣", tag: tags.BQNfun, key: "{" },
  { glyph: "⊢", tag: tags.BQNfun, key: "}" },
  { glyph: "⥊", tag: tags.BQNfun, key: "z" },
  { glyph: "∾", tag: tags.BQNfun, key: "," },
  { glyph: "≍", tag: tags.BQNfun, key: "." },
  { glyph: "⋈", tag: tags.BQNfun, key: "Z" },
  { glyph: "↑", tag: tags.BQNfun, key: "r" },
  { glyph: "↓", tag: tags.BQNfun, key: "c" },
  { glyph: "↕", tag: tags.BQNfun, key: "d" },
  { glyph: "«", tag: tags.BQNfun, key: "H" },
  { glyph: "»", tag: tags.BQNfun, key: "L" },
  { glyph: "⌽", tag: tags.BQNfun, key: "q" },
  { glyph: "⍉", tag: tags.BQNfun, key: "a" },
  { glyph: "/", tag: tags.BQNfun, key: null },
  { glyph: "⍋", tag: tags.BQNfun, key: "T" },
  { glyph: "⍒", tag: tags.BQNfun, key: "V" },
  { glyph: "⊏", tag: tags.BQNfun, key: "i" },
  { glyph: "⊑", tag: tags.BQNfun, key: "I" },
  { glyph: "⊐", tag: tags.BQNfun, key: "o" },
  { glyph: "⊒", tag: tags.BQNfun, key: "O" },
  { glyph: "∊", tag: tags.BQNfun, key: "e" },
  { glyph: "⍷", tag: tags.BQNfun, key: "E" },
  { glyph: "⊔", tag: tags.BQNfun, key: "u" },
  { glyph: "!", tag: tags.BQNfun, key: null },
  { glyph: "˙", tag: tags.BQNmod1, key: '"' },
  { glyph: "˜", tag: tags.BQNmod1, key: "`" },
  { glyph: "∘", tag: tags.BQNmod2, key: "j" },
  { glyph: "○", tag: tags.BQNmod2, key: "k" },
  { glyph: "⊸", tag: tags.BQNmod2, key: "h" },
  { glyph: "⟜", tag: tags.BQNmod2, key: "l" },
  { glyph: "⌾", tag: tags.BQNmod2, key: "K" },
  { glyph: "⊘", tag: tags.BQNmod2, key: "%" },
  { glyph: "◶", tag: tags.BQNmod2, key: "$" },
  { glyph: "⎊", tag: tags.BQNmod2, key: "^" },
  { glyph: "⎉", tag: tags.BQNmod2, key: "!" },
  { glyph: "˘", tag: tags.BQNmod1, key: "1" },
  { glyph: "⚇", tag: tags.BQNmod2, key: "@" },
  { glyph: "¨", tag: tags.BQNmod1, key: "2" },
  { glyph: "⌜", tag: tags.BQNmod1, key: "4" },
  { glyph: "⍟", tag: tags.BQNmod2, key: "#" },
  { glyph: "⁼", tag: tags.BQNmod1, key: "3" },
  { glyph: "´", tag: tags.BQNmod1, key: "5" },
  { glyph: "˝", tag: tags.BQNmod1, key: "6" },
  { glyph: "`", tag: tags.BQNmod1, key: null },
  { glyph: "←", tag: null, key: "[" },
  { glyph: "⇐", tag: null, key: "?" },
  { glyph: "↩", tag: null, key: "'" },
  { glyph: "⋄", tag: tags.BQNlist, key: ";" },
  { glyph: ",", tag: null, key: null },
  { glyph: ".", tag: null, key: null },
  { glyph: "(", tag: null, key: null },
  { glyph: ")", tag: null, key: null },
  { glyph: "{", tag: tags.BQNblock, key: null },
  { glyph: "}", tag: tags.BQNblock, key: null },
  { glyph: ":", tag: null, key: null },
  { glyph: ";", tag: null, key: null },
  { glyph: "?", tag: null, key: null },
  { glyph: "⟨", tag: tags.BQNlist, key: "(" },
  { glyph: "⟩", tag: tags.BQNlist, key: ")" },
  { glyph: "‿", tag: tags.BQNlist, key: " " },
  { glyph: "·", tag: tags.BQNnothing, key: "," },
  { glyph: "•", tag: null, key: "0" },
  { glyph: "𝕨", tag: null, key: "w" },
  { glyph: "𝕎", tag: tags.BQNfun, key: "W" },
  { glyph: "𝕩", tag: null, key: "x" },
  { glyph: "𝕏", tag: tags.BQNfun, key: "X" },
  { glyph: "𝕗", tag: null, key: "f" },
  { glyph: "𝔽", tag: tags.BQNfun, key: "F" },
  { glyph: "𝕘", tag: null, key: "g" },
  { glyph: "𝔾", tag: tags.BQNfun, key: "G" },
  { glyph: "𝕤", tag: null, key: "s" },
  { glyph: "𝕊", tag: tags.BQNfun, key: "S" },
  { glyph: "𝕣", tag: tags.BQNmod2, key: "R" },
  { glyph: "¯", tag: tags.BQNnumber, key: "9" },
  { glyph: "∞", tag: tags.BQNnumber, key: "8" },
  { glyph: "π", tag: tags.BQNnumber, key: "p" },
  { glyph: "@", tag: tags.BQNstring, key: null },
  { glyph: "#", tag: tags.BQNcomment, key: null },
];

export let keymap: Map<string, Glyph> = new Map();
for (let glyph of glyphs) if (glyph.key != null) keymap.set(glyph.key, glyph);

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
