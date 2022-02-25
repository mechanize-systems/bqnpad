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

export let keymap: Map<string, string> = new Map([
  ["`", "˜"],
  ["1", "˘"],
  ["2", "¨"],
  ["3", "⁼"],
  ["4", "⌜"],
  ["5", "´"],
  ["6", "˝"],
  ["7", "7"],
  ["8", "∞"],
  ["9", "¯"],
  ["0", "•"],
  ["-", "÷"],
  ["=", "×"],
  ["~", "¬"],
  ["!", "⎉"],
  ["@", "⚇"],
  ["#", "⍟"],
  ["$", "◶"],
  ["%", "⊘"],
  ["^", "⎊"],
  ["(", "⟨"],
  [")", "⟩"],
  ["_", "√"],
  ["+", "⋆"],
  ["q", "⌽"],
  ["w", "𝕨"],
  ["e", "∊"],
  ["r", "↑"],
  ["t", "∧"],
  ["u", "⊔"],
  ["i", "⊏"],
  ["o", "⊐"],
  ["p", "π"],
  ["[", "←"],
  ["]", "→"],
  ["W", "𝕎"],
  ["E", "⍷"],
  ["R", "𝕣"],
  ["T", "⍋"],
  ["Y", "Y"],
  ["U", "U"],
  ["I", "⊑"],
  ["O", "⊒"],
  ["{", "⊣"],
  ["}", "⊢"],
  ["a", "⍉"],
  ["s", "𝕤"],
  ["d", "↕"],
  ["f", "𝕗"],
  ["g", "𝕘"],
  ["h", "⊸"],
  ["j", "∘"],
  ["k", "○"],
  ["l", "⟜"],
  [";", "⋄"],
  ["'", "↩"],
  ["S", "𝕊"],
  ["F", "𝔽"],
  ["G", "𝔾"],
  ["H", "«"],
  ["K", "⌾"],
  ["L", "»"],
  [",", "·"],
  ["z", "⥊"],
  ['"', "˙"],
  ["x", "𝕩"],
  ["c", "↓"],
  ["v", "∨"],
  ["b", "⌊"],
  ["m", "≡"],
  [",", "∾"],
  [".", "≍"],
  ["/", "≠"],
  ["Z", "⋈"],
  ["X", "𝕏"],
  ["V", "⍒"],
  ["B", "⌈"],
  ["M", "≢"],
  ["<", "≤"],
  [">", "≥"],
  ["?", "⇐"],
  [" ", "‿"],
]);

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
          changes: { from: pos.from, to: pos.to, insert },
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
