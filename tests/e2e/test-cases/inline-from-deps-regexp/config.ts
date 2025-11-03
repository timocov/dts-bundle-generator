import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: [
			/^fake-package$/,
			'fake-types-lib-1',
			'fake-types-lib-', // not matched
		]
	},
};

export = config;
