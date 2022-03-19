.PHONY: init
init:
	git submodule init
	git submodule update
	pnpm install
	make all

.PHONY: all
all: grammar/bqn.grammar.js grammar/bqn.grammar.terms.js

.PHONY: start
start:
	pnpm asap serve

.PHONY: check
check:
	pnpm tsc -b

.PHONY: fmt
fmt:
	prettier -w '*.ts' '*.d.ts' '*.json'

.PHONY: clean
clean:
	rm -f bqn.grammar.js bqn.grammar.terms.js
	rm -rf node_modules/.cache/asap/

.PHONY: test
test:
	mocha grammar/test/test-bqn-grammar.mjs

grammar/bqn.grammar.js grammar/bqn.grammar.terms.js: grammar/bqn.grammar
	pnpm lezer-generator $(<) --names --cjs --output $(@)

.PHONY: deploy
deploy:
	flyctl --app bqnpad deploy .
