import assert from 'assert';
import * as path from 'path';

import { generateDtsBundle } from '../../src/bundle-generator.ts';

describe('names shadowed only in code that is not a part of a bundle', () => {
	const fixturesDir = path.resolve(import.meta.dirname, 'fixtures', 'name-shadowing-in-unused-code');
	const compilationOptions = { preferredConfigPath: path.resolve(import.meta.dirname, '../e2e/test-cases/tsconfig.json') };

	it('should not fail with exportReferencedTypes when a name is shadowed in a tree-shaken statement', () => {
		const filePath = path.resolve(fixturesDir, 'tree-shaken', 'input.ts');
		const result = generateDtsBundle([{ filePath, output: { noBanner: true, exportReferencedTypes: true } }], compilationOptions)[0];
		assert.match(result, /export interface Target {/);
	});

	it('should not rename a symbol when its name is shadowed only in another entry point', () => {
		const output = { noBanner: true };
		const result = generateDtsBundle([
			{ filePath: path.resolve(fixturesDir, 'other-entry', 'first.ts'), output },
			{ filePath: path.resolve(fixturesDir, 'other-entry', 'second.ts'), output },
		], compilationOptions);

		assert.match(result[0], /export interface Target {/);
		assert.doesNotMatch(result[0], /Target$1/);
	});
});
