all: bundle.js

bundle.js: delphi.js
	browserify delphi.js -o bundle.js

clean:
	rm -f data/*

run: bundle.js
	PORT=8000 node server.js
