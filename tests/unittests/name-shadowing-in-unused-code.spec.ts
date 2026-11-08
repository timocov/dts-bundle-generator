import assert from 'assert';
import * as path from 'path';

import { generateDtsBundle } from '../../src/bundle-generator';

describe('names shadowed only in code that is not a part of a bundle', () => {
	const fixturesDir = path.resolve(__dirname, 'name-shadowing-in-unused-code');

	it('should not fail with exportReferencedTypes when a name is shadowed in a tree-shaken statement', () => {
		const filePath = path.resolve(fixturesDir, 'tree-shaken', 'input.ts');
		const result = generateDtsBundle([{ filePath, output: { noBanner: true, exportReferencedTypes: true } }])[0];
		assert.match(result, /export interface Target {/);
	});

	it('should not rename a symbol when its name is shadowed only in another entry point', () => {
		const output = { noBanner: true };
		const result = generateDtsBundle([
			{ filePath: path.resolve(fixturesDir, 'other-entry', 'first.ts'), output },
			{ filePath: path.resolve(fixturesDir, 'other-entry', 'second.ts'), output },
		], { preferredConfigPath: path.resolve(__dirname, '../e2e/test-cases/tsconfig.json') });

		assert.match(result[0], /export interface Target {/);
		assert.doesNotMatch(result[0], /Target$1/);
	});
});
