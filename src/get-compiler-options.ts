import * as ts from 'typescript';
import * as path from 'path';

import { getAbsolutePath } from './helpers/get-absolute-path';
import { checkDiagnosticsErrors } from './helpers/check-diagnostics-errors';
import { verboseLog } from './logger';

const enum Constants {
	NoInputsWereFoundDiagnosticCode = 18003,
}

const parseConfigHost: ts.ParseConfigHost = {
	useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
	readDirectory: ts.sys.readDirectory,
	fileExists: ts.sys.fileExists,
	readFile: ts.sys.readFile,
};

export function getCompilerOptions(inputFileNames: readonly string[], preferredConfigPath?: string): ts.CompilerOptions {
	const configFileName = preferredConfigPath !== undefined ? preferredConfigPath : findConfig(inputFileNames);

	verboseLog(`Using config: ${configFileName}`);

	const configParseResult = ts.readConfigFile(configFileName, ts.sys.readFile);
	checkDiagnosticsErrors(configParseResult.error !== undefined ? [configParseResult.error] : [], 'Error while processing tsconfig file');

	const compilerOptionsParseResult = ts.parseJsonConfigFileContent(
		configParseResult.config,
		parseConfigHost,
		path.resolve(path.dirname(configFileName)),
		undefined,
		getAbsolutePath(configFileName)
	);

	// we don't want to raise an error if no inputs found in a config file
	// because this error is mostly for CLI, but we'll pass an inputs in createProgram
	const diagnostics = compilerOptionsParseResult.errors
		.filter((d: ts.Diagnostic) => d.code !== Constants.NoInputsWereFoundDiagnosticCode);

	checkDiagnosticsErrors(diagnostics, 'Error while processing tsconfig compiler options');

	return compilerOptionsParseResult.options;
}

function findConfig(inputFiles: readonly string[]): string {
	if (inputFiles.length !== 1) {
		throw new Error('Cannot find tsconfig for multiple files. Please specify preferred tsconfig file');
	}

	// input file could be a relative path to the current path
	// and desired config could be outside of current cwd folder
	// so we have to provide absolute path to find config until the root
	const searchPath = getAbsolutePath(inputFiles[0]);

	const configFileName = ts.findConfigFile(searchPath, ts.sys.fileExists);

	if (!configFileName) {
		throw new Error(`Cannot find config file for file ${searchPath}`);
	}

	return configFileName;
}
