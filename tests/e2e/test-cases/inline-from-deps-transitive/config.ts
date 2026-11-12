import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['fake-package', 'fake-fs'],
	},
	output: {
		sortNodes: true,
	}
};

export default config;
