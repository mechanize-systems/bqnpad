module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["plugin:react-hooks/recommended"],
  ignorePatterns: ["repl/emsdk/**", "repl/CBQN/**"],
  rules: {},
};
