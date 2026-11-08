import assert from 'assert';
import * as path from 'path';

import { generateDtsBundle } from '../../src/bundle-generator';

describe('unresolved import types', () => {
	const fixturesDir = path.resolve(__dirname, 'unresolved-import-types');
	const compilationOptions = { preferredConfigPath: path.resolve(__dirname, '../e2e/test-cases/tsconfig.json') };

	it('should fail by default and suggest the option when the module of an import type cannot be resolved', () => {
		const filePath = path.resolve(fixturesDir, 'unresolved-module.d.ts');
		assert.throws(
			() => generateDtsBundle([{ filePath, output: { noBanner: true } }], compilationOptions),
			/Cannot resolve module "optional-module".*--allow-unresolved-import-types/s
		);
	});

	it('should keep the import type as is with allowUnresolvedImportTypes', () => {
		const filePath = path.resolve(fixturesDir, 'unresolved-module.d.ts');
		const result = generateDtsBundle([{ filePath, output: { noBanner: true } }], { ...compilationOptions, allowUnresolvedImportTypes: true })[0];
		assert.match(result, /export type Optional = import\("optional-module"\)\.Type;/);
	});

	it('should still fail when the module is resolved but the referenced member does not exist', () => {
		const filePath = path.resolve(fixturesDir, 'missing-member.d.ts');
		assert.throws(
			() => generateDtsBundle([{ filePath, output: { noBanner: true } }], { ...compilationOptions, allowUnresolvedImportTypes: true }),
			/Cannot find symbol for node "DoesNotExist"/
		);
	});
});
