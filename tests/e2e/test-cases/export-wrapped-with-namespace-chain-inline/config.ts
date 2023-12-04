import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['package-with-export-eq'],
	},
	output: {
		exportReferencedTypes: false,
	},
};

export = config;
