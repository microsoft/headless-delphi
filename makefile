all: bundle.js

bundle.js: delphi.js
	browserify delphi.js -o bundle.js

clean:
	rm -f data/* deploy.zip

run: bundle.js
	node server.js

zip: bundle.js delphi.css delphi.html favicon.ico package.json server.js
	zip deploy bundle.js delphi.css delphi.html favicon.ico package.json server.js 
	zip -r deploy node_modules/

# for zipdeploy: would use the following, but FTP credentials don't seem to work
#	curl -X POST -u 'headless-delphi\$headless-delphi' https://headless-delphi.scm.azurewebsites.net/api/zipdeploy -T deploy.zip

debug: bundle.js
	node inspect server.js
