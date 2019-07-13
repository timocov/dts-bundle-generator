#!/bin/bash

set -e

# compat with old build scripts
cp -fr ./lib/src/* ./dist
cp README.md LICENSE ./dist

./node_modules/.bin/clear-package-json package.json --fields private -o dist/package.json
