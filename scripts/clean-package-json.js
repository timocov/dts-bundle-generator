#!/usr/bin/env node

/**
 * This script does something like https://github.com/shashkovdanil/clean-publish does
 * but it seems that clean-publish isn't supported anymore and we can't use it in CI
 */

import * as path from 'path';
import * as fs from 'fs';

function main() {
	const packageJsonPath = path.resolve(import.meta.dirname, '..', 'package.json');

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, { encoding: 'utf-8' }));

	delete packageJson.private;
	delete packageJson.devDependencies;
	delete packageJson.scripts;

	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', { encoding: 'utf-8' });
}

if (import.meta.main) {
	main();
}
