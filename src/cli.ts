import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { ArgumentParser } from 'argparse';

import { generateDtsBundle } from './bundle-generator';
import { enableVerbose, normalLog } from './logger';
import { checkProgramDiagnosticsErrors } from './check-diagnostics-errors';
import { getCompilerOptionsForFile } from './get-compiler-options';

const parser = new ArgumentParser();

parser.addArgument(
	['-o', '--out-file'],
	{
		dest: 'outFile',
		help: 'File name of generated d.ts',
		required: false,
	},
);

parser.addArgument(
	['-v', '--verbose'],
	{
		action: 'storeTrue',
		defaultValue: false,
		help: 'Enable verbose logging',
	},
);

parser.addArgument(
	['--no-check'],
	{
		action: 'storeTrue',
		defaultValue: false,
		dest: 'noCheck',
		help: 'Skip validation of generated d.ts file',
		type: Boolean,
	},
);

parser.addArgument(
	['--output-source-file'],
	{
		action: 'storeTrue',
		defaultValue: false,
		dest: 'outputSourceFileName',
		help: 'Add comment with file path the definitions came from',
		type: Boolean,
	},
);

parser.addArgument(
	['--fail-on-class'],
	{
		action: 'storeTrue',
		defaultValue: false,
		dest: 'failOnClass',
		help: 'Fail if generated dts contains class declaration',
		type: Boolean,
	},
);

parser.addArgument(['file'], { nargs: 1 });

const args = parser.parseArgs();
if (args.verbose) {
	enableVerbose();
}

try {
	const inputFilePath = args.file[0];
	const generatedDts = generateDtsBundle(inputFilePath, {
		failOnClass: args.failOnClass,
		outputFilenames: args.outputSourceFileName,
	});

	if (args.outFile == null) {
		const inputFileName = path.parse(inputFilePath).name;
		args.outFile = path.join(inputFilePath, '..', inputFileName + '.d.ts');
	}

	normalLog(`Writing generated file to ${args.outFile}...`);
	fs.writeFileSync(args.outFile, generatedDts);

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
