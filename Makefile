.PHONY: start
start:
	pnpm asap serve

.PHONY: check
check:
	pnpm tsc -b

.PHONY: fmt
fmt:
	prettier -w '*.ts' '*.d.ts' '*.json'

bqn.grammar.js bqn.grammar.terms.js: bqn.grammar
	pnpm lezer-generator $(<) --names --cjs --output $(@)

.PHONY: clean
clean:
	rm -f bqn.grammar.js bqn.grammar.terms.js
	rm -rf node_modules/.cache/asap/

.PHONY: test
test:
	mocha test/test-bqn-grammar.mjs
