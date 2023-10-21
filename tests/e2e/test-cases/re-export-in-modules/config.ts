import { TestCaseConfig } from '../test-case-config';

const config: TestCaseConfig = {
	libraries: {
		allowedTypesLibraries: [],
		importedLibraries: [
			'package-with-cyclic-re-export-1',
			'package-with-cyclic-re-export-2',
			're-export-cycle-dependency-1',
			're-export-cycle-dependency-2',
			're-export-via-eq-v2',
			're-export-via-eq',
			're-export-via-import',
			're-export-via-star-with-rename',
			're-export-via-star',
		],
	},
};

export = config;
