import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['fake-package', 'fake-fs'],
	},
	output: {
		sortNodes: true,
	}
};

export = config;
