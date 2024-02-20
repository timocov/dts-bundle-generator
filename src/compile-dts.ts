import * as ts from 'typescript';

import { verboseLog, warnLog } from './logger';

import { getCompilerOptions } from './get-compiler-options';
import { getAbsolutePath } from './helpers/get-absolute-path';
import { checkProgramDiagnosticsErrors, checkDiagnosticsErrors } from './helpers/check-diagnostics-errors';

export interface CompileDtsResult {
	program: ts.Program;
	rootFilesRemapping: Map<string, string>;
}

const declarationExtsRemapping: Record<string, ts.Extension> = {
	[ts.Extension.Js]: ts.Extension.Js,
	[ts.Extension.Jsx]: ts.Extension.Jsx,
	[ts.Extension.Json]: ts.Extension.Json,
	[ts.Extension.TsBuildInfo]: ts.Extension.TsBuildInfo,
	[ts.Extension.Mjs]: ts.Extension.Mjs,
	[ts.Extension.Cjs]: ts.Extension.Cjs,

	[ts.Extension.Ts]: ts.Extension.Dts,
	[ts.Extension.Tsx]: ts.Extension.Dts,
	[ts.Extension.Dts]: ts.Extension.Dts,

	[ts.Extension.Mts]: ts.Extension.Dmts,
	[ts.Extension.Dmts]: ts.Extension.Dmts,

	[ts.Extension.Cts]: ts.Extension.Dcts,
	[ts.Extension.Dcts]: ts.Extension.Dcts,
} satisfies Record<ts.Extension, ts.Extension>;

export function compileDts(rootFiles: readonly string[], preferredConfigPath?: string, followSymlinks: boolean = true): CompileDtsResult {
	const compilerOptions = getCompilerOptions(rootFiles, preferredConfigPath);

	// currently we don't support these compiler options
	// and removing them shouldn't affect generated code
	// so let's just remove them for this run
	compilerOptions.outDir = undefined;
	compilerOptions.incremental = undefined;
	compilerOptions.tsBuildInfoFile = undefined;
	compilerOptions.declarationDir = undefined;

	// we want to turn this option on because in this case the compile will generate declaration diagnostics out of the box
	compilerOptions.declaration = true;

	if (compilerOptions.composite) {
		warnLog(`Composite projects aren't supported at the time. Prefer to use non-composite project to generate declarations instead or just ignore this message if everything works fine. See https://github.com/timocov/dts-bundle-generator/issues/93`);
		compilerOptions.composite = undefined;
	}

	const dtsFiles = getDeclarationFiles(rootFiles, compilerOptions);

	verboseLog(`dts cache:\n  ${Object.keys(dtsFiles).join('\n  ')}\n`);

	const host = ts.createCompilerHost(compilerOptions);

	if (!followSymlinks) {
		host.realpath = (p: string) => p;
	}

	host.resolveModuleNameLiterals = (moduleLiterals: readonly ts.StringLiteralLike[], containingFile: string): ts.ResolvedModuleWithFailedLookupLocations[] => {
		return moduleLiterals.map((moduleLiteral: ts.StringLiteralLike): ts.ResolvedModuleWithFailedLookupLocations => {
			const resolvedModule = ts.resolveModuleName(moduleLiteral.text, containingFile, compilerOptions, host).resolvedModule;
			if (resolvedModule && !resolvedModule.isExternalLibraryImport) {
				const newExt = declarationExtsRemapping[resolvedModule.extension];

				// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
				if (newExt !== resolvedModule.extension) {
					verboseLog(`Changing module from ${resolvedModule.extension} to ${newExt} for ${resolvedModule.resolvedFileName}`);

					resolvedModule.extension = newExt;
					resolvedModule.resolvedFileName = changeExtensionToDts(resolvedModule.resolvedFileName);
				}
			}

			return { resolvedModule };
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
	let ext: ts.Extension | undefined;

	// `path.extname` doesn't handle `.d.ts` cases (it returns `.ts` instead of `.d.ts`)
	if (fileName.endsWith(ts.Extension.Dts)) {
		return fileName;
	}

	if (fileName.endsWith(ts.Extension.Cts)) {
		ext = ts.Extension.Cts;
	} else if (fileName.endsWith(ts.Extension.Mts)) {
		ext = ts.Extension.Mts;
	} else if (fileName.endsWith(ts.Extension.Ts)) {
		ext = ts.Extension.Ts;
	} else if (fileName.endsWith(ts.Extension.Tsx)) {
		ext = ts.Extension.Tsx;
	}

	if (ext === undefined) {
		return fileName;
	}

	return fileName.slice(0, -ext.length) + declarationExtsRemapping[ext];
}

/**
 * @description Compiles source files into d.ts files and returns map of absolute path to file content
 */
function getDeclarationFiles(rootFiles: readonly string[], compilerOptions: ts.CompilerOptions): Map<string, string> {
	// we must pass `declaration: true` and `noEmit: false` if we want to generate declaration files
	// see https://github.com/microsoft/TypeScript/issues/24002#issuecomment-550549393
	// also, we don't want to generate anything apart from declarations so that's why `emitDeclarationOnly: true` is here
	// it allows to run the tool for projects with allowJs flag enabled to avoid errors like:
	// error TS5055: Cannot write file '<filename>' because it would overwrite input file.
	compilerOptions = {
		...compilerOptions,
		noEmit: false,
		declaration: true,
		emitDeclarationOnly: true,
	};

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
