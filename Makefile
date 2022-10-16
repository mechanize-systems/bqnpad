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

lezer-bqn/bqn.grammar.js lezer-bqn/bqn.grammar.terms.js:
	$(MAKE) -C lezer-bqn $(@:lezer-bqn/%=%)

repl/CBQN/BQN.wasm:
	bash -c '(source ./repl/emsdk/emsdk_env.sh && make lf="-s ENVIRONMENT=worker -s FILESYSTEM=0 -s MODULARIZE=1" -C repl/CBQN emcc-o3)'

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
	$(MAKE) -C lezer-bqn clean
	rm -rf node_modules/.cache/asap/

.PHONY: test
test:
	mocha lezer-bqn/test/test-bqn-grammar.mjs

.PHONY: deploy
deploy:
	flyctl --app bqnpad deploy .
