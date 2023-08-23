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
