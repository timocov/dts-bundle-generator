import * as ts from 'typescript';
import * as path from 'path';

import { checkDiagnosticsErrors } from './check-diagnostics-errors';
import { verboseLog } from './logger';

const parseConfigHost: ts.ParseConfigHost = {
	useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
	readDirectory: ts.sys.readDirectory,
	fileExists: ts.sys.fileExists,
	readFile: ts.sys.readFile,
};

export function getCompilerOptions(inputFileName: string, preferredConfigPath?: string): ts.CompilerOptions {
	const configFileName = preferredConfigPath !== undefined ? preferredConfigPath : findConfig(inputFileName);

	verboseLog(`Using config: ${configFileName}`);

	const configParseResult = ts.readConfigFile(configFileName, ts.sys.readFile);
	checkDiagnosticsErrors(configParseResult.error !== undefined ? [configParseResult.error] : [], 'Error while processing tsconfig file');

	const compilerOptionsParseResult = ts.parseJsonConfigFileContent(configParseResult.config, parseConfigHost, path.join(configFileName, '..'));
	checkDiagnosticsErrors(compilerOptionsParseResult.errors, 'Error while processing tsconfig compiler options');

	return compilerOptionsParseResult.options;
}

function findConfig(inputFile: string): string {
	// special case for windows
	const searchPath = inputFile.replace(/\\/g, '/');

	const configFileName = ts.findConfigFile(searchPath, ts.sys.fileExists);

	if (!configFileName) {
		throw new Error(`Cannot find config file`);
	}

	return configFileName;
}
