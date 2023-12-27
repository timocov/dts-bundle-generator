import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['package-with-export-eq', 'package-with-export-eq-variable'],
	},
	output: {
		exportReferencedTypes: false,
	},
};

export = config;
