import * as path from 'path';
import * as ts from 'typescript';

import { verboseLog, warnLog } from './logger';

import { getCompilerOptions } from './get-compiler-options';
import { getAbsolutePath } from './helpers/get-absolute-path';
import { checkProgramDiagnosticsErrors, checkDiagnosticsErrors } from './helpers/check-diagnostics-errors';

export interface CompileDtsResult {
	program: ts.Program;
	rootFilesRemapping: Map<string, string>;
}

export function compileDts(rootFiles: ReadonlyArray<string>, preferredConfigPath?: string, followSymlinks: boolean = true): CompileDtsResult {
	const compilerOptions = getCompilerOptions(rootFiles, preferredConfigPath);

	// currently we don't support these compiler options
	// and removing them shouldn't affect generated code
	// so let's just remove them for this run
	compilerOptions.outDir = undefined;
	compilerOptions.incremental = undefined;
	compilerOptions.tsBuildInfoFile = undefined;

	const dtsFiles = getDeclarationFiles(rootFiles, compilerOptions);

	verboseLog(`dts cache:\n  ${Object.keys(dtsFiles).join('\n  ')}\n`);

	const host = ts.createCompilerHost(compilerOptions);

	if (!followSymlinks) {
		host.realpath = (path: string) => path;
	}

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
		const storedValue = dtsFiles.get(absolutePath);
		if (storedValue !== undefined) {
			verboseLog(`dts cache match: ${absolutePath}`);
			return ts.createSourceFile(fileName, storedValue, languageVersion);
		}

		verboseLog(`dts cache mismatch: ${absolutePath} (${fileName})`);
		return originalGetSourceFile(fileName, languageVersion, onError);
	};

	const rootFilesRemapping = new Map<string, string>();
	const inputFiles = rootFiles.map((rootFile: string) => {
		const rootDtsFile = changeExtensionToDts(rootFile);
		rootFilesRemapping.set(rootFile, rootDtsFile);
		return rootDtsFile;
	});

	const program = ts.createProgram(inputFiles, compilerOptions, host);
	checkProgramDiagnosticsErrors(program);
	warnAboutTypeScriptFilesInProgram(program);

	return { program, rootFilesRemapping };
}

function changeExtensionToDts(fileName: string): string {
	if (fileName.slice(-5) === '.d.ts') {
		return fileName;
	}

	// .ts, .tsx
	const ext = path.extname(fileName);
	return fileName.slice(0, -ext.length) + '.d.ts';
}

/**
 * @description Compiles source files into d.ts files and returns map of absolute path to file content
 */
function getDeclarationFiles(rootFiles: ReadonlyArray<string>, compilerOptions: ts.CompilerOptions): Map<string, string> {
	const program = ts.createProgram(rootFiles, compilerOptions);
	const allFilesAreDeclarations = program.getSourceFiles().every((s: ts.SourceFile) => s.isDeclarationFile);

	const declarations = new Map<string, string>();
	if (allFilesAreDeclarations) {
		// if all files are declarations we don't need to compile the project twice
		// so let's just return empty map to speed up
		verboseLog('Skipping compiling the project to generate d.ts because all files in it are d.ts already');
		return declarations;
	}

	checkProgramDiagnosticsErrors(program);

	const emitResult = program.emit(
		undefined,
		(fileName: string, data: string) => declarations.set(getAbsolutePath(fileName), data),
		undefined,
		true
	);

	checkDiagnosticsErrors(emitResult.diagnostics, 'Errors while emitting declarations');

	return declarations;
}

function warnAboutTypeScriptFilesInProgram(program: ts.Program): void {
	const nonDeclarationFiles = program.getSourceFiles().filter((file: ts.SourceFile) => !file.isDeclarationFile);
	if (nonDeclarationFiles.length !== 0) {
		warnLog(`WARNING: It seems that some files in the compilation still are not declaration files.
For more information see https://github.com/timocov/dts-bundle-generator/issues/53.
If you think this is a mistake, feel free to open new issue or just ignore this warning.
  ${nonDeclarationFiles.map((file: ts.SourceFile) => file.fileName).join('\n  ')}
`);
	}
}
