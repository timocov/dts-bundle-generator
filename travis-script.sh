#!/usr/bin/env sh

set -e

if [ -z $TS_VERSION ]; then
    echo "Please specify TypeScript version via set TS_VERSION env variable";
    exit 1;
fi;

npm install typescript@$TS_VERSION
npm run compile

if [ $COMPILE_ONLY ]; then
    echo "Tests are skipped because COMPILE_ONLY env variable is not empty";
    exit 0;
fi;

echo "Run tests";

npm run lint
npm run compile-tests
npm run test
