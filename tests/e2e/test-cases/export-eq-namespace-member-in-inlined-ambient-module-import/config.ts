import type { TestCaseConfig } from '../test-case-config.ts';

const config: TestCaseConfig = {
	libraries: {
		allowedTypesLibraries: [],
	},
	output: {
		inlineDeclareExternals: true,
	},
};

export default config;
