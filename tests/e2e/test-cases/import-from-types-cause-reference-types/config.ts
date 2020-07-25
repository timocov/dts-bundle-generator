import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		allowedTypesLibraries: ['node', 'fake-types-lib-2'],
		importedLibraries: ['events', 'fake-types-lib-2.5'],
	},
};

export = config;
