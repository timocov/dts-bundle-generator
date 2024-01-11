import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['fake-package', 'fake-fs'],
	},
	output: {
		exportReferencedTypes: true,
		sortNodes: true,
	},
};

export = config;
