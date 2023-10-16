import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		allowedTypesLibraries: [],
		importedLibraries: ['re-export-via-eq', 're-export-via-eq-v2', 're-export-via-star', 're-export-via-star-with-rename', 're-export-via-import'],
	},
};

export = config;
