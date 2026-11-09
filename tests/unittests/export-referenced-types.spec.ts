import assert from 'assert';
import * as path from 'path';

import { generateDtsBundle } from '../../src/bundle-generator';

describe('exportReferencedTypes with name collisions', () => {
	const filePath = path.resolve(__dirname, 'export-referenced-types-collision', 'input.ts');

	it('should not fail by default (disabled)', () => {
		const result = generateDtsBundle([{ filePath, output: { noBanner: true } }])[0];
		assert.doesNotMatch(result, /export interface/);
	});

	it('should not fail when disabled explicitly', () => {
		assert.doesNotThrow(() => generateDtsBundle([{ filePath, output: { noBanner: true, exportReferencedTypes: false } }]));
	});

	it('should fail when enabled and a referenced type is renamed because of a name collision', () => {
		assert.throws(
			() => generateDtsBundle([{ filePath, output: { noBanner: true, exportReferencedTypes: true } }]),
			/Foo \(from .*b\.d\.ts\)[\s\S]*output\.exportReferencedTypes/
		);
	});

	it('should fail when enabled and a referenced type is renamed because its name is shadowed in a nested scope', () => {
		assert.throws(
			() => generateDtsBundle([{ filePath: path.resolve(__dirname, 'export-referenced-types-shadowing', 'input.ts'), output: { noBanner: true, exportReferencedTypes: true } }]),
			/Target \(from .*other\.d\.ts\)[\s\S]*output\.exportReferencedTypes/
		);
	});
});
