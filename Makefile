.PHONY: lib purge

jquery_version = 1.4
jqueryui_version = 1.8

lib:
	curl -o "scripts/jquery.min.js" \
		"http://ajax.googleapis.com/ajax/libs/jquery/$(jquery_version)/jquery.min.js"
	curl -o "scripts/jquery-ui.min.js" \
		"http://ajax.googleapis.com/ajax/libs/jqueryui/$(jqueryui_version)/jquery-ui.min.js"
	curl -o "scripts/jquery-json.min.js" \
		"http://jquery-json.googlecode.com/files/jquery.json-2.2.min.js"
	curl -o "scripts/chrjs.js" \
		"http://github.com/tiddlyweb/chrjs/raw/master/main.js"
	curl -o "scripts/sudo.js" \
		"http://github.com/FND/jsutil/raw/master/sudo.js"
	curl -o "scripts/util.js" \
		"http://github.com/FND/jquery/raw/master/util.js"

purge:
	cat .gitignore | while read -r entry; do rm -r $$entry; done || true
