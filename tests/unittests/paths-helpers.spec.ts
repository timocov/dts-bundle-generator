import * as assert from 'assert';

import { isPathsLibraryName, getPathsLibraryName } from '../../src/helpers/paths';

describe('isPathsLibraryName', () => {
	it('should detect valid library name', () => {
		assert.strictEqual(isPathsLibraryName('my-library'), true);
		assert.strictEqual(isPathsLibraryName('*'), false);
		assert.strictEqual(isPathsLibraryName('my-library/*'), false);
		assert.strictEqual(isPathsLibraryName('my-library/my-module'), false);
	});
});

describe('getPathsLibraryName', () => {
	it('should return correct library name', () => {
		assert.strictEqual(getPathsLibraryName('path/to/my-library.js', [{ libraryName: 'my-library', libraryPath: 'path/to/my-library' }]), 'my-library');
		assert.strictEqual(getPathsLibraryName('path/to/my-library.ts', [{ libraryName: 'my-library', libraryPath: 'path/to/my-library' }]), 'my-library');
		assert.strictEqual(getPathsLibraryName('path/to/my-library.d.ts', [{ libraryName: 'my-library', libraryPath: 'path/to/my-library' }]), 'my-library');
		assert.strictEqual(getPathsLibraryName('path/to/my-library/my-module.js', [{ libraryName: 'my-library', libraryPath: 'path/to/my-library' }]), null);
		assert.strictEqual(getPathsLibraryName('path/to/my-library.js', []), null);
	});
});
