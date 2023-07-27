build:
	tsc

watch:
	tsc -w

test:
	jest

publish:
	rm -rf ./lib; tsc; npm pack
