all: bundle.js

bundle.js: delphi.js
	browserify delphi.js -o bundle.js

clean:
	rm -f data/*

run: bundle.js
	node server.js

debug: bundle.js
	node inspect server.js
