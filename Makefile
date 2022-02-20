start:
	pnpm asap serve

check:
	pnpm tsc -b

fmt:
	prettier -w '*.ts' '*.d.ts' '*.json'
