all: bundle.js

bundle.js: delphi.js
	browserify delphi.js -o bundle.js

clean:
	rm data/*
