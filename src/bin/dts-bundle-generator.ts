#!/usr/bin/env node

import * as path from 'path';
import ts from 'typescript';
import { Command } from 'commander';

import { loadConfigFile, type BundlerConfig, type ConfigEntryPoint } from '../config-file/load-config-file.ts';

import { generateDtsBundle } from '../bundle-generator.ts';
import { checkProgramDiagnosticsErrors } from '../helpers/check-diagnostics-errors.ts';
import { getCompilerOptions } from '../get-compiler-options.ts';
import { fixPath } from '../helpers/fix-path.ts';
import { measureTime } from '../helpers/measure-time.ts';
import { packageVersion } from '../helpers/package-version.ts';

import {
	enableNormalLog,
	enableVerbose,
	errorLog,
	normalLog,
	verboseLog,
	warnLog,
} from '../logger.ts';

interface ParsedArgs {
	files: string[];

	sort: boolean;
	silent: boolean;
	verbose: boolean;
	check: boolean;
	failOnClass: boolean;
	inlineDeclareGlobal: boolean;
	inlineDeclareExternals: boolean;
	disableSymlinksFollowing: boolean;
	banner: boolean;
	respectPreserveConstEnum: boolean;
	exportReferencedTypes: boolean;
	allowUnresolvedImportTypes: boolean;

	outFile: string | undefined;
	umdModuleName: string | undefined;
	project: string | undefined;
	checkProject: string | undefined;
	config: string | undefined;

	externalInlines: string[] | undefined;
	externalImports: string[] | undefined;
	externalTypes: string[] | undefined;
}

/**
 * An optional variadic option (e.g. `--external-types [names...]`) is `true` if it is specified without values.
 * In this case (as well as for empty strings, e.g. `--external-types ""`) it is treated as an empty array.
 */
function toStringsArray(value: string[] | true | undefined): string[] | undefined {
	if (value === undefined) {
		return undefined;
	}

	return value === true ? [] : value.filter((item: string) => item.length !== 0);
}

function parseArgs(): ParsedArgs {
	const program = new Command('dts-bundle-generator')
		.usage('[options] <file(s)>')
		.argument('[files...]')
		.option(
			'-o, --out-file <file>',
			'File name of generated d.ts'
		)
		.option(
			'--verbose',
			'Enable verbose logging',
			false
		)
		.option(
			'--silent',
			'Disable any logging except errors',
			false
		)
		.option(
			'--no-check',
			'Skip validation of generated d.ts file'
		)
		.option(
			'--fail-on-class',
			'Fail if generated dts contains class declaration',
			false
		)
		.option(
			'--external-inlines [names...]',
			'Array of package names from node_modules to inline typings from.\n' +
				'Used types will be inlined into the output file'
		)
		.option(
			'--external-imports [names...]',
			'Array of package names from node_modules to import typings from.\n' +
				'Used types will be imported using "import { First, Second } from \'library-name\';".\n' +
				'By default all libraries will be imported (except inlined libraries and libraries from @types)'
		)
		.option(
			'--external-types [names...]',
			'Array of package names from @types to import typings from via the triple-slash reference directive.\n' +
				'By default all packages are allowed and will be used according to their usages'
		)
		.option(
			'--umd-module-name <name>',
			'Name of the UMD module. If specified then `export as namespace ModuleName;` will be emitted'
		)
		.option(
			'--project <path>',
			'Path to the tsconfig.json file that will be used for the compilation'
		)
		.option(
			'--check-project <path>',
			'Path to the tsconfig.json file that will be used for the validation of generated d.ts files (the --project value is used by default)'
		)
		.option(
			'--sort',
			'Sort output nodes',
			false
		)
		.option(
			'--inline-declare-global',
			'Enables inlining of `declare global` statements contained in files which should be inlined (all local files and packages from `--external-inlines`)',
			false
		)
		.option(
			'--inline-declare-externals',
			'Enables inlining of `declare module` statements of the global modules (e.g. `declare module \'external-module\' {}`, but NOT `declare module \'./internal-module\' {}`) contained in files which should be inlined (all local files and packages from inlined libraries)',
			false
		)
		.option(
			'--disable-symlinks-following',
			'(EXPERIMENTAL) Disables resolving of symlinks to the original path. See https://github.com/timocov/dts-bundle-generator/issues/39 for more information',
			false
		)
		.option(
			'--respect-preserve-const-enum',
			'Enables stripping the `const` keyword from every direct-exported (or re-exported) from entry file `const enum`. See https://github.com/timocov/dts-bundle-generator/issues/110 for more information',
			false
		)
		.option(
			'--export-referenced-types',
			'Marks all interfaces, types and const enums as exported even if they aren\'t exported directly. By default a node is exported only if it is exported from the root source file. Fails if a referenced type cannot be exported because it was renamed due to name collisions.',
			false
		)
		.option(
			'--allow-unresolved-import-types',
			'Keeps `import()` types whose module cannot be resolved as is (and prints a warning) instead of failing. Useful for libraries that intentionally check for optional modules in their typings',
			false
		)
		.option(
			'--config <path>',
			'File path to the generator config file'
		)
		.option(
			'--no-banner',
			'Allows remove "Generated by dts-bundle-generator" comment from the output'
		)
		.version(packageVersion(), '-v, --version', 'Show version number')
		.helpOption('-h, --help', 'Show help')
		.configureHelp({ helpWidth: Math.min(100, process.stdout.columns || 100) })
		.addHelpText('after', `
Examples:
  $ dts-bundle-generator path/to/your/entry-file.ts
  $ dts-bundle-generator path/to/your/entry-file.ts path/to/your/entry-file-2.ts
  $ dts-bundle-generator --external-types jquery react -- entry-file.ts`)
		.parse();

	type RawOptions = Omit<ParsedArgs, 'files' | 'externalInlines' | 'externalImports' | 'externalTypes'> & {
		externalInlines: string[] | true | undefined;
		externalImports: string[] | true | undefined;
		externalTypes: string[] | true | undefined;
	};

	const options = program.opts<RawOptions>();

	return {
		...options,
		files: program.args,
		externalInlines: toStringsArray(options.externalInlines),
		externalImports: toStringsArray(options.externalImports),
		externalTypes: toStringsArray(options.externalTypes),
	};
}

function generateOutFileName(inputFilePath: string): string {
	const inputFileName = path.parse(inputFilePath).name;
	return fixPath(path.join(inputFilePath, '..', inputFileName + '.d.ts'));
}

/**
 * Validates a generated d.ts file by compiling it.
 * Compiler options are taken from the config file at `configPath`, or found automatically if it isn't specified.
 * Only compiler options matter - `files`/`include`/`exclude` are ignored because the generated file is used as a root file.
 *
 * @throws if the file has errors
 */
function checkGeneratedFile(filePath: string, configPath: string | undefined): void {
	const compilerOptions = getCompilerOptions([filePath], configPath);
	if (compilerOptions.skipLibCheck) {
		compilerOptions.skipLibCheck = false;
		warnLog('Compiler option "skipLibCheck" is disabled to properly check generated output');
	}

	// we want to turn this option on because in this case the compile will generate declaration diagnostics out of the box
	compilerOptions.declaration = true;

	checkProgramDiagnosticsErrors(ts.createProgram([filePath], compilerOptions));
}

function getOutFile(entry: ConfigEntryPoint): string {
	return entry.outFile !== undefined ? entry.outFile : generateOutFileName(entry.filePath);
}

// eslint-disable-next-line complexity
function main(): void {
	const args = parseArgs();

	if (args.silent && args.verbose) {
		throw new Error('Cannot use both silent and verbose options at the same time');
	} else if (args.verbose) {
		enableVerbose();
	} else if (!args.silent) {
		enableNormalLog();
	}

	if (!args.check && args.checkProject !== undefined) {
		throw new Error('Cannot use both no-check and check-project options at the same time');
	}

	let bundlerConfig: BundlerConfig;

	if (args.config !== undefined) {
		verboseLog(`Trying to load config from ${args.config} file...`);
		bundlerConfig = loadConfigFile(args.config);
	} else {
		if (args.files.length < 1) {
			throw new Error('No input files specified');
		}

		if (args.files.length > 1 && args.outFile) {
			throw new Error('Cannot use outFile with multiple entries');
		}

		bundlerConfig = {
			entries: args.files.map<ConfigEntryPoint>((entryPath: string) => {
				return {
					filePath: entryPath,
					outFile: args.outFile,
					noCheck: !args.check,
					checkConfigPath: args.checkProject,
					libraries: {
						allowedTypesLibraries: args.externalTypes,
						importedLibraries: args.externalImports,
						inlinedLibraries: args.externalInlines,
					},
					output: {
						inlineDeclareExternals: args.inlineDeclareExternals,
						inlineDeclareGlobals: args.inlineDeclareGlobal,
						umdModuleName: args.umdModuleName,
						sortNodes: args.sort,
						noBanner: !args.banner,
						respectPreserveConstEnum: args.respectPreserveConstEnum,
						exportReferencedTypes: args.exportReferencedTypes,
					},
					failOnClass: args.failOnClass,
				};
			}),
			compilationOptions: {
				preferredConfigPath: args.project,
				followSymlinks: !args.disableSymlinksFollowing,
				allowUnresolvedImportTypes: args.allowUnresolvedImportTypes,
			},
		};
	}

	verboseLog(`Total entries count=${bundlerConfig.entries.length}`);

	const generatedDts = generateDtsBundle(bundlerConfig.entries, bundlerConfig.compilationOptions);

	for (let i = 0; i < bundlerConfig.entries.length; ++i) {
		const entry = bundlerConfig.entries[i];
		const outFile = getOutFile(entry);

		normalLog(`Writing ${entry.filePath} -> ${outFile}`);
		ts.sys.writeFile(outFile, generatedDts[i]);
	}

	const entriesToCheck = bundlerConfig.entries.filter((entry: ConfigEntryPoint) => !entry.noCheck);
	if (entriesToCheck.length === 0) {
		normalLog('File checking is skipped (due nothing to check)');
		return;
	}

	normalLog('Checking generated files...');
	let checkFailed = false;
	for (const entry of entriesToCheck) {
		try {
			checkGeneratedFile(getOutFile(entry), entry.checkConfigPath ?? bundlerConfig.compilationOptions?.preferredConfigPath);
		} catch (e) {
			checkFailed = true;
		}
	}

	if (checkFailed) {
		throw new Error('Failed to check some of generated bundles, check error messages above');
	}
}

try {
	const executionTime = measureTime(main);
	normalLog(`Done in ${(executionTime / 1000).toFixed(2)}s`);
} catch (ex) {
	normalLog('');
	errorLog(`Error: ${(ex as Error).message}`);
	process.exit(1);
}
