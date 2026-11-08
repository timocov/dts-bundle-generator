import * as path from 'path';

import { errorLog } from '../logger';
import { EntryPointConfig, CompilationOptions } from '../bundle-generator';
import { getAbsolutePath } from '../helpers/get-absolute-path';
import { checkSchemaMatch, SchemeDescriptor, schemaPrimitiveValues } from './check-schema-match';

export interface ConfigEntryPoint extends EntryPointConfig {
	/**
	 * Path of generated d.ts.
	 * If not specified - the path will be input file with replaced extension to `.d.ts`.
	 */
	outFile?: string;

	/**
	 * Skip validation of generated d.ts file
	 */
	noCheck?: boolean;

	/**
	 * Path to the tsconfig file that will be used for the validation of the generated d.ts file.
	 * If not specified, `compilationOptions.preferredConfigPath` is used (or the config is found automatically for a single entry).
	 * Only compiler options are used, `files`/`include`/`exclude` are ignored.
	 * Cannot be used together with `noCheck`.
	 */
	checkConfigPath?: string;
}

export interface BundlerConfig {
	entries: ConfigEntryPoint[];
	compilationOptions?: CompilationOptions;
}

/**
 * @internal Do not output this function in generated dts for the npm package
 */
export function loadConfigFile(configPath: string): BundlerConfig {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const possibleConfig = require(getAbsolutePath(configPath));

	const errors: string[] = [];
	if (!checkSchemaMatch(possibleConfig, configScheme, errors)) {
		errorLog(errors.join('\n'));
		throw new Error('Cannot parse config file');
	}

	if (!Array.isArray(possibleConfig.entries) || possibleConfig.entries.length === 0) {
		throw new Error('No entries found');
	}

	const configFolder = path.dirname(configPath);
	possibleConfig.entries.forEach((entry: ConfigEntryPoint) => {
		entry.filePath = getAbsolutePath(entry.filePath, configFolder);
		if (entry.outFile !== undefined) {
			entry.outFile = getAbsolutePath(entry.outFile, configFolder);
		}

		if (entry.checkConfigPath !== undefined) {
			if (entry.noCheck) {
				throw new Error(`"checkConfigPath" cannot be used together with "noCheck" (entry ${entry.filePath})`);
			}

			entry.checkConfigPath = getAbsolutePath(entry.checkConfigPath, configFolder);
		}
	});

	if (possibleConfig.compilationOptions !== undefined && possibleConfig.compilationOptions.preferredConfigPath !== undefined) {
		possibleConfig.compilationOptions.preferredConfigPath = getAbsolutePath(possibleConfig.compilationOptions.preferredConfigPath, configFolder);
	}

	return possibleConfig;
}

const configScheme: SchemeDescriptor<BundlerConfig> = {
	compilationOptions: {
		followSymlinks: schemaPrimitiveValues.boolean,
		preferredConfigPath: schemaPrimitiveValues.string,
	},
	entries: [
		{
			filePath: schemaPrimitiveValues.requiredString,
			outFile: schemaPrimitiveValues.string,
			failOnClass: schemaPrimitiveValues.boolean,
			noCheck: schemaPrimitiveValues.boolean,
			checkConfigPath: schemaPrimitiveValues.string,
			libraries: {
				allowedTypesLibraries: [schemaPrimitiveValues.string],
				importedLibraries: [schemaPrimitiveValues.string],
				inlinedLibraries: [schemaPrimitiveValues.string],
			},
			output: {
				inlineDeclareGlobals: schemaPrimitiveValues.boolean,
				inlineDeclareExternals: schemaPrimitiveValues.boolean,
				sortNodes: schemaPrimitiveValues.boolean,
				umdModuleName: schemaPrimitiveValues.string,
				noBanner: schemaPrimitiveValues.boolean,
				respectPreserveConstEnum: schemaPrimitiveValues.boolean,
				exportReferencedTypes: schemaPrimitiveValues.boolean,
			},
		},
	],
};
