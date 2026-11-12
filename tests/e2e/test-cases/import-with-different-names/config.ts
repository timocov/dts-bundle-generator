import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
	libraries: {
		importedLibraries: ['fake-package', 'package-with-export-eq'],
	},
};

export default config;
