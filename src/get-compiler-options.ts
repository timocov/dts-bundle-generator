import * as path from 'path';
import * as ts from 'typescript';

import { verboseLog } from './logger';

export function getCompilerOptionsForFile(filePath: string): ts.CompilerOptions {
	// special case for windows
	const searchPath = path.join(ts.sys.getCurrentDirectory(), filePath).replace(/\\/g, '/');

	const configFileName = ts.findConfigFile(searchPath, ts.sys.fileExists);

	if (!configFileName) {
		throw new Error(`Cannot find config file`);
	}

	verboseLog(`Using config: ${configFileName}`);

	const configParseResult = ts.readConfigFile(configFileName, ts.sys.readFile);
	if (configParseResult.error) {
		throw new Error(`Error while process tsconfig file: ${JSON.stringify(configParseResult.error)}`);
	}

	const compilerOptionsParseResult = ts.convertCompilerOptionsFromJson(configParseResult.config.compilerOptions, './');
	if (compilerOptionsParseResult.errors.length !== 0) {
		throw new Error(`Error while process tsconfig compiler options: ${JSON.stringify(compilerOptionsParseResult.errors)}`);
	}

	return compilerOptionsParseResult.options;
}
