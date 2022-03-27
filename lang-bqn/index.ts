/**
 * Editor support for BQN.
 */
import * as Autocomplete from "@codemirror/autocomplete";
import { HighlightStyle, Tag, styleTags } from "@codemirror/highlight";
import {
  LRLanguage,
  LanguageSupport,
  delimitedIndent,
  indentNodeProp,
} from "@codemirror/language";
import * as State from "@codemirror/state";
import * as View from "@codemirror/view";
import { parser } from "lezer-bqn";

let tags = {
  BQNval: Tag.define(),
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
  { tag: tags.BQNval, color: "#444" },
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

export let highlightDark = HighlightStyle.define([
  { tag: tags.BQNval, color: "#eee" },
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
  VAL: tags.BQNval,
});

export let language = LRLanguage.define({
  parser: parser.configure({
    props: [
      bqnStyleTags,
      indentNodeProp.add({
        BLOCK: delimitedIndent({ closing: "}", align: true }),
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "#" },
    indentOnInput: /^\s*(\]|}|⟩)$/,
    closeBrackets: { brackets: ["(", "{", "⟨", "[", "'", '"'] },
  },
});

export type Glyph = {
  glyph: string;
  key: string | null;
  tag: Tag;
  title: string;
};

export let glyphs: Glyph[] = [
  {
    glyph: "+",
    title: "Conjuage/Add",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "-",
    title: "Negate/Substract",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "×",
    title: "Sign/Multiply",
    tag: tags.BQNfun,
    key: "=",
  },
  {
    glyph: "÷",
    title: "Reciprocal/Divide",
    tag: tags.BQNfun,
    key: "-",
  },
  {
    glyph: "⋆",
    title: "Exponential/Power",
    tag: tags.BQNfun,
    key: "+",
  },
  {
    glyph: "√",
    title: "Square root/Root",
    tag: tags.BQNfun,
    key: "_",
  },
  {
    glyph: "⌊",
    title: "Floor/Minimum",
    tag: tags.BQNfun,
    key: "b",
  },
  {
    glyph: "⌈",
    title: "Celing/Maximum",
    tag: tags.BQNfun,
    key: "B",
  },
  {
    glyph: "∧",
    title: "Sort up/And",
    tag: tags.BQNfun,
    key: "t",
  },
  {
    glyph: "∨",
    title: "Sort down/Or",
    tag: tags.BQNfun,
    key: "v",
  },
  {
    glyph: "¬",
    title: "Not/Span",
    tag: tags.BQNfun,
    key: "~",
  },
  {
    glyph: "|",
    title: "Absolute value/Modulus",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "≤",
    title: "Less than or equal to",
    tag: tags.BQNfun,
    key: "<",
  },
  {
    glyph: "<",
    title: "Enclose/Less than",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: ">",
    title: "Merge/Greater than",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "≥",
    title: "Greater than or equal to",
    tag: tags.BQNfun,
    key: ">",
  },
  {
    glyph: "=",
    title: "Rank/Equals",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "≠",
    title: "Length/Not equals",
    tag: tags.BQNfun,
    key: "/",
  },
  {
    glyph: "≡",
    title: "Depth/Match",
    tag: tags.BQNfun,
    key: "m",
  },
  {
    glyph: "≢",
    title: "Shape/Not match",
    tag: tags.BQNfun,
    key: "M",
  },
  {
    glyph: "⊣",
    title: "Identity/Left",
    tag: tags.BQNfun,
    key: "{",
  },
  {
    glyph: "⊢",
    title: "Identity/Right",
    tag: tags.BQNfun,
    key: "}",
  },
  {
    glyph: "⥊",
    title: "Deshape/Reshape",
    tag: tags.BQNfun,
    key: "z",
  },
  {
    glyph: "∾",
    title: "Join/Join to",
    tag: tags.BQNfun,
    key: ",",
  },
  {
    glyph: "≍",
    title: "Solo/Couple",
    tag: tags.BQNfun,
    key: ".",
  },
  {
    glyph: "⋈",
    title: "Enlist/Pair",
    tag: tags.BQNfun,
    key: "Z",
  },
  {
    glyph: "↑",
    title: "Prefixes/Take",
    tag: tags.BQNfun,
    key: "r",
  },
  {
    glyph: "↓",
    title: "Suffixes/Drop",
    tag: tags.BQNfun,
    key: "c",
  },
  {
    glyph: "↕",
    title: "Range/Windows",
    tag: tags.BQNfun,
    key: "d",
  },
  {
    glyph: "«",
    title: "Shift before",
    tag: tags.BQNfun,
    key: "H",
  },
  {
    glyph: "»",
    title: "Shift after",
    tag: tags.BQNfun,
    key: "L",
  },
  {
    glyph: "⌽",
    title: "Reverse/Rotate",
    tag: tags.BQNfun,
    key: "q",
  },
  {
    glyph: "⍉",
    title: "Transpose/Reorder axis",
    tag: tags.BQNfun,
    key: "a",
  },
  {
    glyph: "/",
    title: "Indices/Replicate",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "⍋",
    title: "Grade up/Bins up",
    tag: tags.BQNfun,
    key: "T",
  },
  {
    glyph: "⍒",
    title: "Grade down/Bins down",
    tag: tags.BQNfun,
    key: "V",
  },
  {
    glyph: "⊏",
    title: "First cell/Select",
    tag: tags.BQNfun,
    key: "i",
  },
  {
    glyph: "⊑",
    title: "First/Pick",
    tag: tags.BQNfun,
    key: "I",
  },
  {
    glyph: "⊐",
    title: "Classify/Index of",
    tag: tags.BQNfun,
    key: "o",
  },
  {
    glyph: "⊒",
    title: "Occurrence count/Progressive index of",
    tag: tags.BQNfun,
    key: "O",
  },
  {
    glyph: "∊",
    title: "Mark first/Member of",
    tag: tags.BQNfun,
    key: "e",
  },
  {
    glyph: "⍷",
    title: "Deduplicate/Find",
    tag: tags.BQNfun,
    key: "E",
  },
  {
    glyph: "⊔",
    title: "Group indices/Group",
    tag: tags.BQNfun,
    key: "u",
  },
  {
    glyph: "!",
    title: "Assert/Assert with message",
    tag: tags.BQNfun,
    key: null,
  },
  {
    glyph: "˙",
    title: "Constant",
    tag: tags.BQNmod1,
    key: '"',
  },
  {
    glyph: "˜",
    title: "Self/Swap",
    tag: tags.BQNmod1,
    key: "`",
  },
  {
    glyph: "∘",
    title: "Atop",
    tag: tags.BQNmod2,
    key: "j",
  },
  {
    glyph: "○",
    title: "Over",
    tag: tags.BQNmod2,
    key: "k",
  },
  {
    glyph: "⊸",
    title: "Before/Bind",
    tag: tags.BQNmod2,
    key: "h",
  },
  {
    glyph: "⟜",
    title: "After/Bind",
    tag: tags.BQNmod2,
    key: "l",
  },
  {
    glyph: "⌾",
    title: "Under",
    tag: tags.BQNmod2,
    key: "K",
  },
  {
    glyph: "⊘",
    title: "Valences",
    tag: tags.BQNmod2,
    key: "%",
  },
  {
    glyph: "◶",
    title: "Choose",
    tag: tags.BQNmod2,
    key: "$",
  },
  {
    glyph: "⎊",
    title: "Catch",
    tag: tags.BQNmod2,
    key: "^",
  },
  {
    glyph: "⎉",
    title: "Rank",
    tag: tags.BQNmod2,
    key: "!",
  },
  {
    glyph: "˘",
    title: "Cells",
    tag: tags.BQNmod1,
    key: "1",
  },
  {
    glyph: "⚇",
    title: "Depth",
    tag: tags.BQNmod2,
    key: "@",
  },
  {
    glyph: "¨",
    title: "Each",
    tag: tags.BQNmod1,
    key: "2",
  },
  {
    glyph: "⌜",
    title: "Table",
    tag: tags.BQNmod1,
    key: "4",
  },
  {
    glyph: "⍟",
    title: "Repeat",
    tag: tags.BQNmod2,
    key: "#",
  },
  {
    glyph: "⁼",
    title: "Undo",
    tag: tags.BQNmod1,
    key: "3",
  },
  {
    glyph: "´",
    title: "Fold",
    tag: tags.BQNmod1,
    key: "5",
  },
  {
    glyph: "˝",
    title: "Insert",
    tag: tags.BQNmod1,
    key: "6",
  },
  {
    glyph: "`",
    title: "Scan",
    tag: tags.BQNmod1,
    key: null,
  },
  {
    glyph: "←",
    title: "Define",
    tag: tags.BQNval,
    key: "[",
  },
  {
    glyph: "⇐",
    title: "Export",
    tag: tags.BQNval,
    key: "?",
  },
  {
    glyph: "↩",
    title: "Change",
    tag: tags.BQNval,
    key: "'",
  },
  {
    glyph: "⋄",
    title: "Separator",
    tag: tags.BQNlist,
    key: ";",
  },
  {
    glyph: ",",
    title: "Separator",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: ".",
    title: "Namespace field",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: "(",
    title: "Begin expression",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: ")",
    title: "End expression",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: "{",
    title: "Begin block",
    tag: tags.BQNblock,
    key: null,
  },
  {
    glyph: "}",
    title: "End block",
    tag: tags.BQNblock,
    key: null,
  },
  {
    glyph: ";",
    title: "Next body",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: ":",
    title: "Header",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: "?",
    title: "Predicate",
    tag: tags.BQNval,
    key: null,
  },
  {
    glyph: "⟨",
    title: "Begin list",
    tag: tags.BQNlist,
    key: "(",
  },
  {
    glyph: "⟩",
    title: "End list",
    tag: tags.BQNlist,
    key: ")",
  },
  {
    glyph: "‿",
    title: "Strand",
    tag: tags.BQNlist,
    key: " ",
  },
  {
    glyph: "·",
    title: "Nothing",
    tag: tags.BQNnothing,
    key: ":",
  },
  {
    glyph: "•",
    title: "System",
    tag: tags.BQNval,
    key: "0",
  },
  {
    glyph: "𝕨",
    title: "Left argument",
    tag: tags.BQNval,
    key: "w",
  },
  {
    glyph: "𝕎",
    title: "Left argument (as function)",
    tag: tags.BQNfun,
    key: "W",
  },
  {
    glyph: "𝕩",
    title: "Right argument",
    tag: tags.BQNval,
    key: "x",
  },
  {
    glyph: "𝕏",
    title: "Right argument (as function)",
    tag: tags.BQNfun,
    key: "X",
  },
  {
    glyph: "𝕗",
    title: "Modifier left operand",
    tag: tags.BQNval,
    key: "f",
  },
  {
    glyph: "𝔽",
    title: "Modifier left operand (as function)",
    tag: tags.BQNfun,
    key: "F",
  },
  {
    glyph: "𝕘",
    title: "Modifier right operand",
    tag: tags.BQNval,
    key: "g",
  },
  {
    glyph: "𝔾",
    title: "Modifier right operand (as function)",
    tag: tags.BQNfun,
    key: "G",
  },
  {
    glyph: "𝕤",
    title: "Current function (as subject)",
    tag: tags.BQNval,
    key: "s",
  },
  {
    glyph: "𝕊",
    title: "Current function",
    tag: tags.BQNfun,
    key: "S",
  },
  {
    glyph: "𝕣",
    title: "Current modifier",
    tag: tags.BQNmod2,
    key: "R",
  },
  {
    glyph: "¯",
    title: "Minus",
    tag: tags.BQNnumber,
    key: "9",
  },
  {
    glyph: "π",
    title: "Pi",
    tag: tags.BQNnumber,
    key: "p",
  },
  {
    glyph: "∞",
    title: "Infinity",
    tag: tags.BQNnumber,
    key: "8",
  },
  {
    glyph: "@",
    title: "Null character",
    tag: tags.BQNstring,
    key: null,
  },
  {
    glyph: "#",
    title: "Comment",
    tag: tags.BQNcomment,
    key: null,
  },
];

export let keymap: Map<string, Glyph> = new Map();
for (let glyph of glyphs) if (glyph.key != null) keymap.set(glyph.key, glyph);

function glyphInput(): State.Extension {
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
          userEvent: "input",
          changes: { from: pos.from, to: pos.to, insert: insert.glyph },
        } as State.TransactionSpec;
    }
    return [tr] as State.TransactionSpec[];
  });

  return [transactionFilter, manageExpecting];
}

let glyphCompletions: Autocomplete.Completion[] = glyphs.map((glyph) => {
  let detail = glyph.glyph;
  if (glyph.key != null) detail = `\\${glyph.key} ${detail}`;
  return {
    label: `\\${glyph.title}`,
    apply: glyph.glyph,
    detail,
  };
});

let glyphCompletion: Autocomplete.CompletionSource = (
  context: Autocomplete.CompletionContext,
) => {
  let word = context.matchBefore(/\\[A-Za-z]*/);
  if (word == null || (word.from == word.to && !context.explicit)) return null;
  return {
    from: word.from,
    filter: true,
    options: glyphCompletions,
  };
};

/**
 * Configure extension for BQN.
 */
export function bqn() {
  let extensions: State.Extension[] = [
    glyphInput(),
    Autocomplete.autocompletion({
      override: [glyphCompletion],
      activateOnTyping: false,
    }),
  ];
  return new LanguageSupport(language, extensions);
}
