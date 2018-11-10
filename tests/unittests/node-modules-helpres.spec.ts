import * as assert from 'assert';

import { getTypesLibraryName, getLibraryName } from '../../src/helpers/node-modules';

describe('getLibraryName', () => {
	it('should return correct library name', () => {
		assert.strictEqual(getLibraryName('node_modules/typescript/index.js'), 'typescript');
		assert.strictEqual(getLibraryName('./node_modules/typescript/index.js'), 'typescript');
		assert.strictEqual(getLibraryName('./src/index.js'), null, 'Not node_modules folder');
		assert.strictEqual(getLibraryName('node_modules/@types/fake-package/index.d.ts'), '@types/fake-package', 'fake-package package');
		assert.strictEqual(getLibraryName('node_modules/some-package/node_modules/@types/fake-inside-package/index.d.ts'), '@types/fake-inside-package', 'node_modules inside other node_modules');
		assert.strictEqual(getLibraryName('node_modules/@types/some-package/node_modules/not-types-package/index.d.ts'), 'not-types-package', 'node_modules inside node_modules/@types');
	});
});

describe('getTypesLibraryName', () => {
	it('should return correct library types name', () => {
		assert.strictEqual(getTypesLibraryName('node_modules/typescript/index.js'), null);
		assert.strictEqual(getTypesLibraryName('./node_modules/typescript/index.js'), null);
		assert.strictEqual(getTypesLibraryName('./src/index.js'), null, 'Not node_modules folder');
		assert.strictEqual(getTypesLibraryName('node_modules/@types/fake-package/index.d.ts'), 'fake-package', 'fake-package package');
		assert.strictEqual(getTypesLibraryName('node_modules/some-package/node_modules/@types/fake-inside-package/index.d.ts'), 'fake-inside-package', 'node_modules inside other node_modules');
		assert.strictEqual(getTypesLibraryName('node_modules/@types/some-package/node_modules/not-types-package/index.d.ts'), null, 'node_modules inside node_modules/@types');
	});
});
