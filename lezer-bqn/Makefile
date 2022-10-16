.PHONY: build
build: bqn.grammar.js bqn.grammar.terms.js

.PHONY: clean
clean:
	rm -f bqn.grammar.js bqn.grammar.terms.js

.PHONY: test
test:
	pnpm mocha test/test-bqn-grammar.mjs

bqn.grammar.js bqn.grammar.terms.js: bqn.grammar ../pnpm-lock.yaml
	pnpm lezer-generator $(<) --names --cjs --output $(@)

