#!/bin/bash

set -e

rm -rf ./dist
mkdir -p ./dist

# compat with old build scripts
cp -fr ./lib/src/* ./dist
find ./dist -name "*.d.ts" -delete
cp README.md LICENSE ./dist

npm run bundle-dts

./node_modules/.bin/clear-package-json package.json --fields private -o dist/package.json
