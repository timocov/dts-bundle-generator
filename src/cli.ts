import * as path from 'path';
import * as ts from 'typescript';
import { ArgumentParser } from 'argparse';

import { generateDtsBundle } from './bundle-generator';
import { checkProgramDiagnosticsErrors } from './check-diagnostics-errors';
import { getCompilerOptionsForFile } from './get-compiler-options';

import {
	enableVerbose,
	normalLog,
	verboseLog,
} from './logger';

const parser = new ArgumentParser();

parser.addArgument(
	['-o', '--out-file'],
	{
		dest: 'outFile',
		help: 'File name of generated d.ts',
		required: false,
	}
);

parser.addArgument(
	['-v', '--verbose'],
	{
		action: 'storeTrue',
		defaultValue: false,
		help: 'Enable verbose logging',
	}
);

parser.addArgument(
	['--no-check'],
	{
		action: 'storeTrue',
		defaultValue: false,
		dest: 'noCheck',
		help: 'Skip validation of generated d.ts file',
		type: Boolean,
	}
);

parser.addArgument(
	['--output-source-file'],
	{
		action: 'storeTrue',
		defaultValue: false,
		dest: 'outputSourceFileName',
		help: 'Add comment with file path the definitions came from',
		type: Boolean,
	}
);

parser.addArgument(
	['--fail-on-class'],
	{
		action: 'storeTrue',
		defaultValue: false,
		dest: 'failOnClass',
		help: 'Fail if generated dts contains class declaration',
		type: Boolean,
	}
);

parser.addArgument(
	['--external-inlines'],
	{
		action: 'store',
		dest: 'externalInlines',
		help: 'Comma-separated packages from node_modules to inline typings from it. Used types will be just inlined into output file',
		required: false,
		type: String,
	}
);

parser.addArgument(
	['--external-imports'],
	{
		action: 'store',
		dest: 'externalImports',
		help: 'Comma-separated packages from node_modules to import typings from it. Used types will be imported by "import { First, Second } from \'library-name\';". By default all libraries will be imported (except inlined)',
		required: false,
		type: String,
	}
);

parser.addArgument(
	['--external-types'],
	{
		action: 'store',
		dest: 'externalTypes',
		help: 'Comma-separated packages from @types to import typings from it via triple-slash reference directive. By default all packages are allowed and will be used according their usages',
		required: false,
		type: String,
	}
);

parser.addArgument(
	['--umd-module-name'],
	{
		action: 'store',
		dest: 'umdModuleName',
		help: 'The name of UMD module. If specified `export as namespace ModuleName;` will be emitted',
		required: false,
		type: String,
	}
);

parser.addArgument(
	['--config'],
	{
		action: 'store',
		dest: 'config',
		help: 'File path to generator config file',
		required: false,
		type: String,
	}
);

parser.addArgument(['file'], { nargs: 1 });

// tslint:disable-next-line:no-any
function configToArgs(config: any, inFile: string): string[] {
	const result: string[] = [];
	for (const key of Object.keys(config)) {
		const value = config[key];

		if (typeof value === 'boolean') {
			if (value === true) {
				result.push(`--${key}`);
			}

			continue;
		}

		result.push(`--${key}`);

		if (Array.isArray(value)) {
			result.push(value.join(','));
		} else {
			result.push(value.toString());
		}
	}

	result.push(inFile);

	return result;
}

function parseArray(str: string): string[] {
	return str.split(',');
}

let args = parser.parseArgs();

if (args.config != null) {
	const configFilePath = args.config;
	if (!ts.sys.fileExists(configFilePath)) {
		throw new Error(`Config file "${configFilePath}" does not exist`);
	}

	const configText = ts.sys.readFile(configFilePath);
	if (configText === undefined) {
		throw new Error('Cannot read config file');
	}

	const config = JSON.parse(configText);
	args = parser.parseArgs(configToArgs(config, args.file[0]));

	if (args.outFile != null) {
		args.outFile = path.resolve(configFilePath, '..', args.outFile);
	}
}

if (args.verbose) {
	enableVerbose();
}

verboseLog(`Arguments: ${JSON.stringify(args)}`);

try {
	const inputFilePath = args.file[0];
	const generatedDts = generateDtsBundle(inputFilePath, {
		failOnClass: args.failOnClass,
		outputFilenames: args.outputSourceFileName,
		inlinedLibraries: args.externalInlines ? parseArray(args.externalInlines) : undefined,
		importedLibraries: args.externalImports ? parseArray(args.externalImports) : undefined,
		allowedTypesLibraries: args.externalTypes ? parseArray(args.externalTypes) : undefined,
		umdModuleName: args.umdModuleName,
	});

	if (args.outFile == null) {
		const inputFileName = path.parse(inputFilePath).name;
		args.outFile = path.join(inputFilePath, '..', inputFileName + '.d.ts');
	}

	normalLog(`Writing generated file to ${args.outFile}...`);
	ts.sys.writeFile(args.outFile, generatedDts);

	if (args.noCheck) {
		normalLog('Checking of the file is skipped due "no-check" flag');
		process.exit(0);
	}

	normalLog('Checking of the generated file...');
	const program = ts.createProgram([args.outFile], getCompilerOptionsForFile(inputFilePath));
	checkProgramDiagnosticsErrors(program);
	normalLog('Done.');
} catch (ex) {
	console.error(`Error: ${ex.message}`);
	process.exit(1);
}
