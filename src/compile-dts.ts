import * as path from 'path';
import * as ts from 'typescript';

import { verboseLog, normalLog } from './logger';

import { getCompilerOptionsForFile } from './get-compiler-options';
import { checkProgramDiagnosticsErrors } from './check-diagnostics-errors';

interface DeclarationFiles {
	[filePath: string]: string;
}

export function compileDts(rootFile: string): ts.Program {
	const compilerOptions = getCompilerOptionsForFile(rootFile);
	if (compilerOptions.outDir !== undefined) {
		normalLog('Compiler options `outDir` is not supported and will be removed while generating dts');
		compilerOptions.outDir = undefined;
	}

	const dtsFiles = getDeclarationFiles(rootFile, compilerOptions);

	verboseLog(`dts cache:\n  ${Object.keys(dtsFiles).join('\n  ')}\n`);

	const host = ts.createCompilerHost(compilerOptions);

	host.resolveModuleNames = (moduleNames: string[], containingFile: string) => {
		return moduleNames.map((moduleName: string) => {
			const resolvedModule = ts.resolveModuleName(moduleName, containingFile, compilerOptions, host).resolvedModule;
			if (resolvedModule && !resolvedModule.isExternalLibraryImport && resolvedModule.extension !== ts.Extension.Dts) {
				resolvedModule.extension = ts.Extension.Dts;

				verboseLog(`Change module from .ts to .d.ts: ${resolvedModule.resolvedFileName}`);

				resolvedModule.resolvedFileName = changeExtensionToDts(resolvedModule.resolvedFileName);
			}

			return resolvedModule as ts.ResolvedModule;
		});
	};

	const originalGetSourceFile = host.getSourceFile;
	host.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void) => {
		const absolutePath = getAbsolutePath(fileName);
		if (dtsFiles[absolutePath]) {
			verboseLog(`dts cache match: ${absolutePath}`);
			return ts.createSourceFile(fileName, dtsFiles[absolutePath], languageVersion);
		}

		verboseLog(`dts cache mismatch: ${absolutePath} (${fileName})`);
		return originalGetSourceFile(fileName, languageVersion, onError);
	};

	const program = ts.createProgram([changeExtensionToDts(rootFile)], compilerOptions, host);
	checkProgramDiagnosticsErrors(program);

	return program;
}

function changeExtensionToDts(fileName: string): string {
	if (fileName.slice(-5) === '.d.ts') {
		return fileName;
	}

	// .ts, .tsx
	const ext = path.extname(fileName);
	return fileName.slice(0, -ext.length) + '.d.ts';
}

function getAbsolutePath(fileName: string): string {
	if (!path.isAbsolute(fileName)) {
		fileName = path.join(ts.sys.getCurrentDirectory(), fileName);
	}

	fileName = fileName.replace(/\\/g, '/');
	return fileName;
}

/**
 * @description Compiles source files into d.ts files and returns map of absolute path to file content
 */
function getDeclarationFiles(rootFile: string, compilerOptions: ts.CompilerOptions): DeclarationFiles {
	const program = ts.createProgram([rootFile], compilerOptions);
	checkProgramDiagnosticsErrors(program);

	const declarations: DeclarationFiles = {};
	program.emit(
		undefined,
		(fileName: string, data: string) => {
			declarations[getAbsolutePath(fileName)] = data;
		},
		undefined,
		true
	);

	return declarations;
}
