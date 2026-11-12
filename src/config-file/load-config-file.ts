import { createRequire } from 'module';
import * as path from 'path';

import { errorLog } from '../logger.ts';
import type { EntryPointConfig, CompilationOptions } from '../bundle-generator.ts';
import { getAbsolutePath } from '../helpers/get-absolute-path.ts';
import { checkSchemaMatch, type SchemeDescriptor, schemaPrimitiveValues } from './check-schema-match.ts';

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

const require = createRequire(import.meta.url);

/**
 * Loads a config file synchronously.
 * Both CommonJS and ES modules are supported (the latter is loaded via `require(esm)`, so top-level await isn't allowed),
 * for ES modules the config is expected to be the default export.
 */
function requireConfigFile(configPath: string): unknown {
	const loadedModule: unknown = require(configPath);
	if (isModuleNamespaceObject(loadedModule) && loadedModule.default !== undefined) {
		return loadedModule.default;
	}

	return loadedModule;
}

function isModuleNamespaceObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[Symbol.toStringTag] === 'Module';
}

/**
 * @internal Do not output this function in generated dts for the npm package
 */
export function loadConfigFile(configPath: string): BundlerConfig {
	const possibleConfig = requireConfigFile(getAbsolutePath(configPath));

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
		allowUnresolvedImportTypes: schemaPrimitiveValues.boolean,
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
