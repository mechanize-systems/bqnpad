import { HighlightStyle, Tag, styleTags } from "@codemirror/highlight";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import type { Extension } from "@codemirror/state";

import { parser } from "./bqn.grammar.js";

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

let highlight = HighlightStyle.define([
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

let language = LRLanguage.define({
  parser: parser.configure({
    props: [bqnStyleTags],
  }),
  languageData: {
    commentTokens: { line: "#" },
    indentOnInput: /^\s*(\]|\}|\)|end|else|elseif|catch|finally)/,
    closeBrackets: { brackets: ["(", "[", "{", "'", '"', "`"] },
  },
});

export function bqn() {
  let extensions: Extension[] = [highlight];
  return new LanguageSupport(language, extensions);
}
