import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['fake-package'],
	},
	output: {
		exportReferencedTypes: true,
	},
};

export = config;
