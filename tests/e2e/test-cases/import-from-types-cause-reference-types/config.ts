import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
	libraries: {
		allowedTypesLibraries: ['node', 'fake-types-lib-2'],
		importedLibraries: ['events', 'fake-types-lib-2.5'],
	},
};

export default config;
