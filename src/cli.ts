#!/usr/bin/env node

import * as path from 'path';
import * as ts from 'typescript';
import * as yargs from 'yargs';

import { generateDtsBundle } from './bundle-generator';
import { checkProgramDiagnosticsErrors } from './check-diagnostics-errors';
import { getCompilerOptions } from './get-compiler-options';

import {
	enableVerbose,
	normalLog,
	verboseLog,
} from './logger';

// tslint:disable-next-line:no-any
function stringToArray(data: any): string[] {
	if (typeof data !== 'string') {
		throw new Error(`${data} is not a string`);
	}

	return data.split(',');
}

interface ParsedArgs extends yargs.Arguments {
	verbose: boolean;
	'no-check': boolean;
	'output-source-file': boolean;
	'fail-on-class': boolean;

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
	.option('output-source-file', {
		type: 'boolean',
		default: false,
		description: 'Add comment with file path the definitions came from',
	})
	.option('fail-on-class', {
		type: 'boolean',
		default: false,
		description: 'Fail if generated dts contains class declaration',
	})
	.option('external-inlines', {
		type: 'string',
		description: 'Comma-separated packages from node_modules to inline typings from it. Used types will be just inlined into output file',
		coerce: stringToArray,
	})
	.option('external-imports', {
		type: 'string',
		description: 'Comma-separated packages from node_modules to import typings from it.\n' +
			'Used types will be imported by "import { First, Second } from \'library-name\';".\n' +
			'By default all libraries will be imported (except inlined)',
		coerce: stringToArray,
	})
	.option('external-types', {
		type: 'string',
		description: 'Comma-separated packages from @types to import typings from it via triple-slash reference directive.\n' +
			'By default all packages are allowed and will be used according their usages',
		coerce: stringToArray,
	})
	.option('umd-module-name', {
		type: 'string',
		description: 'The name of UMD module. If specified `export as namespace ModuleName;` will be emitted',
	})
	.option('project', {
		type: 'string',
		description: 'The path to a tsconfig.json file that will be used to compile files',
	})
	.config('config', 'File path to generator config file')
	.version()
	.strict()
	.example('$0 path/to/your/entry-file.ts', '')
	.argv as ParsedArgs;

if (args.verbose) {
	enableVerbose();
}

verboseLog(`Arguments: ${JSON.stringify(args)}`);

try {
	const inputFilePath = args._[0];
	const generatedDts = generateDtsBundle(inputFilePath, {
		failOnClass: args['fail-on-class'],
		outputFilenames: args['output-source-file'],
		inlinedLibraries: args['external-inlines'],
		importedLibraries: args['external-imports'],
		allowedTypesLibraries: args['external-types'],
		umdModuleName: args['umd-module-name'],
		preferredConfigPath: args.project,
	});

	let outFile = args['out-file'];
	if (outFile === undefined) {
		const inputFileName = path.parse(inputFilePath).name;
		outFile = path.join(inputFilePath, '..', inputFileName + '.d.ts');
	}

	normalLog(`Writing generated file to ${outFile}...`);
	ts.sys.writeFile(outFile, generatedDts);

	if (args['no-check']) {
		normalLog('Checking of the file is skipped due "no-check" flag');
		process.exit(0);
	}

	normalLog('Checking of the generated file...');
	const program = ts.createProgram([outFile], getCompilerOptions(inputFilePath, args.project));
	checkProgramDiagnosticsErrors(program);
	normalLog('Done.');
} catch (ex) {
	console.error(`Error: ${ex.message}`);
	process.exit(1);
}
