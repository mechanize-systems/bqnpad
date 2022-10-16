.PHONY: build
build:
	pnpm tsc --project tsconfig.publish.json

.PHONY: clean
clean:
	rm -f index.d.ts index.js tsconfig.publish.tsbuildinfo

.PHONY: publish
publish: build
	pnpm publish
