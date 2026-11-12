import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
	libraries: {
		inlinedLibraries: ['package-with-export-eq', 'package-with-export-eq-variable'],
	},
	output: {
		exportReferencedTypes: false,
	},
};

export default config;
