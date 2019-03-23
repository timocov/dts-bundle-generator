#!/usr/bin/env node

import * as path from 'path';
import * as ts from 'typescript';
import * as yargs from 'yargs';

import { loadConfigFile, BundlerConfig } from '../config-file/load-config-file';

import { generateDtsBundle } from '../bundle-generator';
import { checkProgramDiagnosticsErrors } from '../helpers/check-diagnostics-errors';
import { getCompilerOptions } from '../get-compiler-options';
import { fixPath } from '../helpers/fix-path';
import { measureTime } from '../helpers/measure-time';

import {
	enableNormalLog,
	enableVerbose,
	errorLog,
	normalLog,
	verboseLog,
	warnLog,
} from '../logger';

// tslint:disable-next-line:no-any
function toStringsArray(data: any): string[] {
	if (!Array.isArray(data)) {
		throw new Error(`${data} is not a array`);
	}

	return data.map(String);
}

interface ParsedArgs extends yargs.Arguments {
	sort: boolean;
	silent: boolean;
	verbose: boolean;
	'no-check': boolean;
	'fail-on-class': boolean;
	'inline-declare-global': boolean;
	'inline-declare-externals': boolean;
	'disable-symlinks-following': boolean;

	'out-file': string | undefined;
	'umd-module-name': string | undefined;
	project: string | undefined;
	config: string | undefined;

	'external-inlines': string[] | undefined;
	'external-imports': string[] | undefined;
	'external-types': string[] | undefined;
}

function parseArgs(): ParsedArgs {
	return yargs
		.usage('Usage: $0 [options] <file(s)>')
		.demandCommand(0)
		.option('out-file', {
			alias: 'o',
			type: 'string',
			description: 'File name of generated d.ts',
		})
		.option('verbose', {
			type: 'boolean',
			default: false,
			description: 'Enable verbose logging',
		})
		.option('silent', {
			type: 'boolean',
			default: false,
			description: 'Disable any logging except errors',
		})
		.option('no-check', {
			type: 'boolean',
			default: false,
			description: 'Skip validation of generated d.ts file',
		})
		.option('fail-on-class', {
			type: 'boolean',
			default: false,
			description: 'Fail if generated dts contains class declaration',
		})
		.option('external-inlines', {
			type: 'array',
			description: 'Array of package names from node_modules to inline typings from.\n' +
				'Used types will be inlined into the output file',
			coerce: toStringsArray,
		})
		.option('external-imports', {
			type: 'array',
			description: 'Array of package names from node_modules to import typings from.\n' +
				'Used types will be imported using "import { First, Second } from \'library-name\';".\n' +
				'By default all libraries will be imported (except inlined libraries and libraries from @types)',
			coerce: toStringsArray,
		})
		.option('external-types', {
			type: 'array',
			description: 'Array of package names from @types to import typings from via the triple-slash reference directive.\n' +
				'By default all packages are allowed and will be used according to their usages',
			coerce: toStringsArray,
		})
		.option('umd-module-name', {
			type: 'string',
			description: 'Name of the UMD module. If specified then `export as namespace ModuleName;` will be emitted',
		})
		.option('project', {
			type: 'string',
			description: 'Path to the tsconfig.json file that will be used for the compilation',
		})
		.option('sort', {
			type: 'boolean',
			default: false,
			description: 'Sort output nodes',
		})
		.option('inline-declare-global', {
			type: 'boolean',
			default: false,
			description: 'Enables inlining of `declare global` statements contained in files which should be inlined (all local files and packages from `--external-inlines`)',
		})
		.option('inline-declare-externals', {
			type: 'boolean',
			default: false,
			description: 'Enables inlining of `declare module` statements of the global modules (e.g. `declare module \'external-module\' {}`, but NOT `declare module \'./internal-module\' {}`) contained in files which should be inlined (all local files and packages from inlined libraries)',
		})
		.option('disable-symlinks-following', {
			type: 'boolean',
			default: false,
			description: '(EXPERIMENTAL) Disables resolving of symlinks to the original path. See https://github.com/timocov/dts-bundle-generator/issues/39 for more information',
		})
		.option('config', {
			type: 'string',
			description: 'File path to the generator config file',
		})
		.version()
		.strict()
		.example('$0 path/to/your/entry-file.ts', '')
		.example('$0 path/to/your/entry-file.ts path/to/your/entry-file-2.ts', '')
		.example('$0 --external-types jquery react -- entry-file.ts', '')
		.wrap(Math.min(100, yargs.terminalWidth()))
		.argv as ParsedArgs;
}

function generateOutFileName(inputFilePath: string): string {
	const inputFileName = path.parse(inputFilePath).name;
	return fixPath(path.join(inputFilePath, '..', inputFileName + '.d.ts'));
}

// tslint:disable-next-line:cyclomatic-complexity
function main(): void {
	const args = parseArgs();

	if (args.silent && args.verbose) {
		throw new Error('Cannot use both silent and verbose options at the same time');
	} else if (args.verbose) {
		enableVerbose();
	} else if (!args.silent) {
		enableNormalLog();
	}

	let bundlerConfig: BundlerConfig;

	if (args.config !== undefined) {
		verboseLog(`Trying to load config from ${args.config} file...`);
		bundlerConfig = loadConfigFile(args.config);
	} else {
		if (args._.length < 1) {
			throw new Error('No input files specified');
		}

		if (args._.length > 1 && args['out-file']) {
			throw new Error('Cannot use outFile with multiple entries');
		}

		bundlerConfig = {
			entries: args._.map((path: string) => {
				return {
					filePath: path,
					outFile: args['out-file'],
					noCheck: args['no-check'],
					libraries: {
						allowedTypesLibraries: args['external-types'],
						importedLibraries: args['external-imports'],
						inlinedLibraries: args['external-inlines'],
					},
					output: {
						inlineDeclareExternals: args['inline-declare-externals'],
						inlineDeclareGlobals: args['inline-declare-global'],
						umdModuleName: args['umd-module-name'],
						sortNodes: args.sort,
					},
					failOnClass: args['fail-on-class'],
				};
			}),
			compilationOptions: {
				preferredConfigPath: args.project,
				followSymlinks: !args['disable-symlinks-following'],
			},
		};
	}

	verboseLog(`Total entries count=${bundlerConfig.entries.length}`);

	const generatedDts = generateDtsBundle(bundlerConfig.entries, bundlerConfig.compilationOptions);

	const outFilesToCheck = [];
	for (let i = 0; i < bundlerConfig.entries.length; ++i) {
		const entry = bundlerConfig.entries[i];
		const outFile = entry.outFile !== undefined ? entry.outFile : generateOutFileName(entry.filePath);

		normalLog(`Writing ${entry.filePath} -> ${outFile}`);
		ts.sys.writeFile(outFile, generatedDts[i]);

		if (!entry.noCheck) {
			outFilesToCheck.push(outFile);
		}
	}

	if (outFilesToCheck.length === 0) {
		normalLog('File checking is skipped (due nothing to check)');
		return;
	}

	normalLog('Checking generated files...');
	const preferredConfigFile = bundlerConfig.compilationOptions !== undefined ? bundlerConfig.compilationOptions.preferredConfigPath : undefined;
	const compilerOptions = getCompilerOptions(outFilesToCheck, preferredConfigFile);
	if (compilerOptions.skipLibCheck) {
		compilerOptions.skipLibCheck = false;
		warnLog('Compiler option "skipLibCheck" is disabled to properly check generated output');
	}

	const program = ts.createProgram(outFilesToCheck, compilerOptions);
	checkProgramDiagnosticsErrors(program);
}

try {
	const executionTime = measureTime(main);
	normalLog(`Done in ${(executionTime / 1000).toFixed(2)}s`);
} catch (ex) {
	errorLog(`Error: ${ex.message}`);
	process.exit(1);
}
