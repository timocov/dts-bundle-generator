import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
	libraries: {
		importedLibraries: ['fs', 'fake-types-lib'],
	},
};

export default config;
