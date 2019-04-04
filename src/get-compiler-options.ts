import * as ts from 'typescript';
import * as path from 'path';

import { fixPath } from './helpers/fix-path';
import { checkDiagnosticsErrors } from './helpers/check-diagnostics-errors';
import { verboseLog } from './logger';

const parseConfigHost: ts.ParseConfigHost = {
	useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
	readDirectory: ts.sys.readDirectory,
	fileExists: ts.sys.fileExists,
	readFile: ts.sys.readFile,
};

export function getCompilerOptions(inputFileNames: ReadonlyArray<string>, preferredConfigPath?: string): ts.CompilerOptions {
	const configFileName = preferredConfigPath !== undefined ? preferredConfigPath : findConfig(inputFileNames);

	verboseLog(`Using config: ${configFileName}`);

	const configParseResult = ts.readConfigFile(configFileName, ts.sys.readFile);
	checkDiagnosticsErrors(configParseResult.error !== undefined ? [configParseResult.error] : [], 'Error while processing tsconfig file');

	const compilerOptionsParseResult = ts.parseJsonConfigFileContent(configParseResult.config, parseConfigHost, path.resolve(path.dirname(configFileName)));
	checkDiagnosticsErrors(compilerOptionsParseResult.errors, 'Error while processing tsconfig compiler options');

	return compilerOptionsParseResult.options;
}

function findConfig(inputFiles: ReadonlyArray<string>): string {
	if (inputFiles.length !== 1) {
		throw new Error('Cannot find tsconfig for multiple files. Please specify preferred tsconfig file');
	}

	const searchPath = fixPath(inputFiles[0]);

	const configFileName = ts.findConfigFile(searchPath, ts.sys.fileExists);

	if (!configFileName) {
		throw new Error(`Cannot find config file for file ${searchPath}`);
	}

	return configFileName;
}
