.PHONY: init
init:
	git submodule init
	git submodule update
	(cd repl/emsdk && ./emsdk install latest)
	(cd repl/emsdk && ./emsdk activate latest)
	pnpm install
	make all

.PHONY: all
all: lezer-bqn/bqn.grammar.js lezer-bqn/bqn.grammar.terms.js repl/CBQN/BQN.wasm

repl/CBQN/BQN.wasm:
	bash -c '(source ./repl/emsdk/emsdk_env.sh && make -C repl/CBQN emcc-o3)'

.PHONY: start
start:
	pnpm asap serve

.PHONY: check
check:
	pnpm tsc -b

.PHONY: lint
lint:
	pnpm eslint . --ext .js,.jsx,.ts,.tsx

.PHONY: fmt
fmt:
	prettier -w '*.ts' '*.d.ts' '*.json'

.PHONY: clean
clean:
	rm -f bqn.grammar.js bqn.grammar.terms.js
	rm -rf node_modules/.cache/asap/

.PHONY: test
test:
	mocha lezer-bqn/test/test-bqn-grammar.mjs

lezer-bqn/bqn.grammar.js lezer-bqn/bqn.grammar.terms.js: lezer-bqn/bqn.grammar
	pnpm lezer-generator $(<) --names --cjs --output $(@)

.PHONY: deploy
deploy:
	flyctl --app bqnpad deploy .
