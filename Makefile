build:
	tsc --project tsconfig.esm.json
	size-limit

watch:
	tsc --project tsconfig.esm.json -w

test:
	jest

clean:
	rm -rf ./lib ./lib.*

publish: clean
	npm run build:esm
	npm run build:cjs
	npm run build:types
	npm pack

run-examples:
	./examples/autoload.ts $(ADDRESS)
	./examples/bytecode.ts $(ADDRESS)
	./examples/dot.ts $(ADDRESS)
	./examples/resolveproxy.ts $(ADDRESS)
