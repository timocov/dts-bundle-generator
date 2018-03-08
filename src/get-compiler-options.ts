import * as ts from 'typescript';

import { verboseLog } from './logger';

export function getCompilerOptions(inputFileName: string, preferredConfigPath?: string): ts.CompilerOptions {
	const configFileName = preferredConfigPath !== undefined ? preferredConfigPath : findConfig(inputFileName);

	verboseLog(`Using config: ${configFileName}`);

	const configParseResult = ts.readConfigFile(configFileName, ts.sys.readFile);
	if (configParseResult.error) {
		throw new Error(`Error while processing tsconfig file: ${JSON.stringify(configParseResult.error)}`);
	}

	const compilerOptionsParseResult = ts.convertCompilerOptionsFromJson(configParseResult.config.compilerOptions, './');
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
