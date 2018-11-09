#!/usr/bin/env node

import * as path from 'path';
import * as ts from 'typescript';
import * as yargs from 'yargs';

import { generateDtsBundle } from '../bundle-generator';
import { checkProgramDiagnosticsErrors } from '../helpers/check-diagnostics-errors';
import { getCompilerOptions } from '../get-compiler-options';

import {
	enableVerbose,
	normalLog,
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
	verbose: boolean;
	'no-check': boolean;
	'fail-on-class': boolean;
	'inline-declare-global': boolean;
	'disable-symlinks-following': boolean;

	'out-file': string | undefined;
	'umd-module-name': string | undefined;
	project: string | undefined;

	'external-inlines': string[] | undefined;
	'external-imports': string[] | undefined;
	'external-types': string[] | undefined;
}

const args = yargs
	.usage('Usage: $0 [options] <file>')
	.demandCommand(1, 1)
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
	.option('disable-symlinks-following', {
		type: 'boolean',
		default: false,
		description: '(EXPERIMENTAL) Disables resolving of symlinks to the original path. See https://github.com/timocov/dts-bundle-generator/issues/39 for more information',
	})
	.config('config', 'File path to the generator config file')
	.version()
	.strict()
	.example('$0 path/to/your/entry-file.ts', '')
	.example('$0 --external-types jquery react -- entry-file.ts', '')
	.wrap(Math.min(100, yargs.terminalWidth()))
	.argv as ParsedArgs;

if (args.verbose) {
	enableVerbose();
}

try {
	const inputFilePath = args._[0];
	const generatedDts = generateDtsBundle(
		[
			{
				filePath: inputFilePath,
				libraries: {
					allowedTypesLibraries: args['external-types'],
					importedLibraries: args['external-imports'],
					inlinedLibraries: args['external-inlines'],
				},
				output: {
					inlineDeclareGlobals: args['inline-declare-global'],
					umdModuleName: args['umd-module-name'],
					sortNodes: args.sort,
				},
				failOnClass: args['fail-on-class'],
			},
		],
		{
			preferredConfigPath: args.project,
			followSymlinks: !args['disable-symlinks-following'],
		}
	);

	let outFile = args['out-file'];
	if (outFile === undefined) {
		const inputFileName = path.parse(inputFilePath).name;
		outFile = path.join(inputFilePath, '..', inputFileName + '.d.ts');
	}

	normalLog(`Writing generated file to ${outFile}...`);
	ts.sys.writeFile(outFile, generatedDts[0]);

	if (args['no-check']) {
		normalLog('File checking is skipped due to "no-check" flag');
		process.exit(0);
	}

	normalLog('Checking the generated file...');
	const compilerOptions = getCompilerOptions([inputFilePath], args.project);
	if (compilerOptions.skipLibCheck) {
		warnLog('BEWARE: The generated file could not be properly checked due enabled "skipLibCheck" compiler option');
	}

	const program = ts.createProgram([outFile], compilerOptions);
	checkProgramDiagnosticsErrors(program);
	normalLog('Done.');
} catch (ex) {
	console.error(`Error: ${ex.message}`);
	process.exit(1);
}
