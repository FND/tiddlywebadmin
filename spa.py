#!/usr/bin/env python

"""
single-page app compiler

uses references to local JavaScript and CSS files and bakes their code into an
HTML5 document

Usage:
  spa.py <filename>
"""

import sys
import os
import re


def main(args):
	args = [unicode(arg, "utf-8") for arg in args]
	filename = args[1]

	jspattern = re.compile(r'<script src="(.*?)"></script>')
	csspattern = re.compile(r'<link rel="stylesheet" href="(.*?)">')
	original = _readfile(filename)

	references = jspattern.findall(original) + csspattern.findall(original)

	resources = {}
	for uri in references:
		if not uri.startswith("http://") and not uri.startswith("https://"):
			filepath = os.sep.join(uri.split("/"))
			resources[uri] = _readfile(filepath)

	spa = []
	for line in original.splitlines():
		for uri, code in resources.items():
			if uri in line:
				if uri.endswith(".js"):
					template = "<script>\n%s\n</script>"
				elif uri.endswith(".css"):
					template = "<style>\n%s\n</style>"
				line = template % code
		spa.append(line)

	filename = filename.replace(".html", ".spa.html")
	f = open(filename, "w")
	f.write("\n".join(spa))
	f.close()

	print "converted %s resources: %s" % (len(resources), filename)

	return True


def _readfile(filepath):
	f = open(filepath, "r")
	content = f.read()
	f.close()
	return content


if __name__ == "__main__":
	status = not main(sys.argv)
	sys.exit(status)
