import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['fake-package', 'fake-types-lib-2'],
	},
	output: {
		exportReferencedTypes: true,
	},
};

export = config;
