import * as ts from 'typescript';
import * as path from 'path';

import { verboseLog } from './logger';

export function getCompilerOptions(inputFileName: string, preferredConfigPath?: string): ts.CompilerOptions {
	const configFileName = preferredConfigPath !== undefined ? preferredConfigPath : findConfig(inputFileName);

	verboseLog(`Using config: ${configFileName}`);

	const configParseResult = ts.readConfigFile(configFileName, ts.sys.readFile);
	if (configParseResult.error) {
		throw new Error(`Error while processing tsconfig file: ${JSON.stringify(configParseResult.error)}`);
	}

	const parseConfigHost: ts.ParseConfigHost = {
		useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
		readDirectory: ts.sys.readDirectory,
		fileExists: ts.sys.fileExists,
		readFile: ts.sys.readFile,
	};

	const compilerOptionsParseResult = ts.parseJsonConfigFileContent(configParseResult.config, parseConfigHost, path.join(configFileName, '..'));
	if (compilerOptionsParseResult.errors.length !== 0) {
		throw new Error(`Error while processing tsconfig compiler options: ${JSON.stringify(compilerOptionsParseResult.errors)}`);
	}

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
