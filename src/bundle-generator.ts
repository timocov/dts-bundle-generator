import * as ts from 'typescript';
import * as path from 'path';

import { compileDts } from './compile-dts';
import { TypesUsageEvaluator } from './types-usage-evaluator';
import {
	ExportType,
	getActualSymbol,
	getDeclarationsForSymbol,
	getExportsForSourceFile,
	getExportTypeForDeclaration,
	hasNodeModifier,
	isAmbientModule,
	isDeclarationFromExternalModule,
	isDeclareGlobalStatement,
	isDeclareModuleStatement,
	isNamespaceStatement,
	isNodeNamedDeclaration,
	SourceFileExport,
} from './helpers/typescript';

import { fixPath } from './helpers/fix-path';
import { getEffectivePaths } from './helpers/paths';

import {
	getModuleInfo,
	ModuleCriteria,
	ModuleInfo,
	ModuleType,
} from './module-info';

import { generateOutput } from './generate-output';

import {
	normalLog,
	verboseLog,
} from './logger';

export interface CompilationOptions {
	/**
	 * EXPERIMENTAL!
	 * Allows disable resolving of symlinks to the original path.
	 * By default following is enabled.
	 * @see https://github.com/timocov/dts-bundle-generator/issues/39
	 */
	followSymlinks?: boolean;

	/**
	 * Path to the tsconfig file that will be used for the compilation.
	 */
	preferredConfigPath?: string;
}

export interface OutputOptions {
	/**
	 * Sort output nodes in ascendant order.
	 */
	sortNodes?: boolean;

	/**
	 * Name of the UMD module.
	 * If specified then `export as namespace ModuleName;` will be emitted.
	 */
	umdModuleName?: string;

	/**
	 * Enables inlining of `declare global` statements contained in files which should be inlined (all local files and packages from inlined libraries).
	 */
	inlineDeclareGlobals?: boolean;
}

export interface LibrariesOptions {
	/**
	 * Array of package names from node_modules to inline typings from.
	 * Used types will be inlined into the output file.
	 */
	inlinedLibraries?: string[];

	/**
	 * Array of package names from node_modules to import typings from.
	 * Used types will be imported using `import { First, Second } from 'library-name';`.
	 * By default all libraries will be imported (except inlined libraries and libraries from @types).
	 */
	importedLibraries?: string[];

	/**
	 * Array of package names from @types to import typings from via the triple-slash reference directive.
	 * By default all packages are allowed and will be used according to their usages.
	 */
	allowedTypesLibraries?: string[];
}

export interface EntryPointConfig {
	/**
	 * Path to input file.
	 */
	filePath: string;

	libraries?: LibrariesOptions;

	/**
	 * Fail if generated dts contains class declaration.
	 */
	failOnClass?: boolean;

	output?: OutputOptions;
}

export function generateDtsBundle(entries: ReadonlyArray<EntryPointConfig>, options: CompilationOptions = {}): string[] {
	normalLog('Compiling input files...');

	const { program, rootFilesRemapping } = compileDts(entries.map((entry: EntryPointConfig) => entry.filePath), options.preferredConfigPath, options.followSymlinks);
	const typeChecker = program.getTypeChecker();

	const typeRoots = ts.getEffectiveTypeRoots(program.getCompilerOptions(), {});
	const paths = getEffectivePaths(program.getCompilerOptions());

	const sourceFiles = program.getSourceFiles().filter((file: ts.SourceFile) => {
		return !isSourceFileDefaultLibrary(program, file);
	});

	verboseLog(`Input source files:\n  ${sourceFiles.map((file: ts.SourceFile) => file.fileName).join('\n  ')}`);

	const typesUsageEvaluator = new TypesUsageEvaluator(sourceFiles, typeChecker);

	return entries.map((entry: EntryPointConfig) => {
		normalLog(`Processing ${entry.filePath}`);

		const newRootFilePath = rootFilesRemapping.get(entry.filePath);
		if (newRootFilePath === undefined) {
			throw new Error(`Cannot remap root source file ${entry.filePath}`);
		}

		const rootSourceFile = getRootSourceFile(program, newRootFilePath);
		const rootSourceFileSymbol = typeChecker.getSymbolAtLocation(rootSourceFile);
		if (rootSourceFileSymbol === undefined) {
			throw new Error(`Symbol for root source file ${newRootFilePath} not found`);
		}

		const librariesOptions: LibrariesOptions = entry.libraries || {};

		const criteria: ModuleCriteria = {
			allowedTypesLibraries: librariesOptions.allowedTypesLibraries,
			importedLibraries: librariesOptions.importedLibraries,
			inlinedLibraries: librariesOptions.inlinedLibraries || [],
			typeRoots,
			paths,
		};

		const rootFileExports = getExportsForSourceFile(typeChecker, rootSourceFileSymbol);
		const rootFileExportSymbols = rootFileExports.map((exp: SourceFileExport) => exp.symbol);

		const collectionResult: CollectingResult = {
			typesReferences: new Set<string>(),
			imports: new Map<string, Set<string>>(),
			statements: [],
		};

		const outputOptions: OutputOptions = entry.output || {};

		const updateResultCommonParams = {
			isStatementUsed: (statement: ts.Statement) => isNodeUsed(statement, rootFileExportSymbols, typesUsageEvaluator, typeChecker),
			shouldStatementBeImported: (statement: ts.DeclarationStatement) => {
				return shouldNodeBeImported(
					statement,
					rootFileExportSymbols,
					typesUsageEvaluator,
					typeChecker,
					isSourceFileDefaultLibrary.bind(null, program)
				);
			},
			shouldDeclareGlobalBeInlined: (currentModule: ModuleInfo) => Boolean(outputOptions.inlineDeclareGlobals) && currentModule.type === ModuleType.ShouldBeInlined,
			getModuleInfo: (fileName: string) => getModuleInfo(fileName, criteria),
			getDeclarationsForExportedAssignment: (exportAssignment: ts.ExportAssignment) => {
				const symbolForExpression = typeChecker.getSymbolAtLocation(exportAssignment.expression);
				if (symbolForExpression === undefined) {
					return [];
				}

				const symbol = getActualSymbol(symbolForExpression, typeChecker);
				return getDeclarationsForSymbol(symbol);
			},
		};

		for (const sourceFile of sourceFiles) {
			verboseLog(`\n\n======= Preparing file: ${sourceFile.fileName} =======`);

			const prevStatementsCount = collectionResult.statements.length;
			const updateFn = sourceFile === rootSourceFile ? updateResultForRootSourceFile : updateResult;
			updateFn(
				{
					...updateResultCommonParams,
					currentModule: getModuleInfo(sourceFile.fileName, criteria),
					statements: sourceFile.statements,
				},
				collectionResult
			);

			if (collectionResult.statements.length === prevStatementsCount) {
				verboseLog(`No output for file: ${sourceFile.fileName}`);
			}
		}

		if (entry.failOnClass) {
			const isClassStatementFound = collectionResult.statements.some((statement: ts.Statement) => ts.isClassDeclaration(statement));
			if (isClassStatementFound) {
				throw new Error('At least 1 class statement is found in generated dts.');
			}
		}

		return generateOutput(
			{
				...collectionResult,
				needStripDefaultKeywordForStatement: (statement: ts.Statement) => statement.getSourceFile() !== rootSourceFile,
				shouldStatementHasExportKeyword: (statement: ts.Statement) => {
					let result = true;

					if (ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isFunctionDeclaration(statement)) {
						const isStatementFromRootFile = statement.getSourceFile() === rootSourceFile;
						const exportType = getExportTypeForDeclaration(rootFileExports, typeChecker, statement);

						const isExportedAsES6NamedExport = exportType === ExportType.ES6Named;
						// the node should have `export` keyword if it is exported directly from root file (not transitive from other module)
						const isExportedAsES6DefaultExport =
							exportType === ExportType.ES6Default
							&& isStatementFromRootFile
							&& hasNodeModifier(statement, ts.SyntaxKind.ExportKeyword);

						// not every class, enum and function can be exported (only exported as es6 export from root file)
						result = isExportedAsES6NamedExport || isExportedAsES6DefaultExport;

						if (ts.isEnumDeclaration(statement)) {
							// const enum always can be exported
							result = result || hasNodeModifier(statement, ts.SyntaxKind.ConstKeyword);
						}
					} else if (isAmbientModule(statement) || ts.isExportDeclaration(statement)) {
						result = false;
					}

					return result;
				},
			},
			{
				sortStatements: outputOptions.sortNodes,
				umdModuleName: outputOptions.umdModuleName,
			}
		);
	});
}

interface CollectingResult {
	typesReferences: Set<string>;
	imports: Map<string, Set<string>>;
	statements: ts.Statement[];
}

interface UpdateParams {
	currentModule: ModuleInfo;
	statements: ReadonlyArray<ts.Statement>;
	isStatementUsed(statement: ts.Statement): boolean;
	shouldStatementBeImported(statement: ts.DeclarationStatement): boolean;
	shouldDeclareGlobalBeInlined(currentModule: ModuleInfo, statement: ts.ModuleDeclaration): boolean;
	getModuleInfo(fileName: string): ModuleInfo;
	getDeclarationsForExportedAssignment(exportAssignment: ts.ExportAssignment): ts.Declaration[];
}

const skippedNodes = [
	ts.SyntaxKind.ExportDeclaration,
	ts.SyntaxKind.ImportDeclaration,
	ts.SyntaxKind.ImportEqualsDeclaration,
];

// tslint:disable-next-line:cyclomatic-complexity
function updateResult(params: UpdateParams, result: CollectingResult): void {
	for (const statement of params.statements) {
		// we should skip import and exports statements
		if (skippedNodes.indexOf(statement.kind) !== -1) {
			continue;
		}

		if (isDeclareModuleStatement(statement)) {
			updateResultForModuleDeclaration(statement, params, result);
			continue;
		}

		if (params.currentModule.type === ModuleType.ShouldBeUsedForModulesOnly) {
			continue;
		}

		if (isDeclareGlobalStatement(statement) && params.shouldDeclareGlobalBeInlined(params.currentModule, statement)) {
			result.statements.push(statement);
			continue;
		}

		if (ts.isExportAssignment(statement) && statement.isExportEquals && params.currentModule.type === ModuleType.ShouldBeImported) {
			updateResultForImportedEqExportAssignment(statement, params, result);
			continue;
		}

		if (!params.isStatementUsed(statement)) {
			verboseLog(`Skip file member: ${statement.getText().replace(/(\n|\r)/g, '').slice(0, 50)}...`);
			continue;
		}

		switch (params.currentModule.type) {
			case ModuleType.ShouldBeReferencedAsTypes:
				addTypesReference(params.currentModule.typesLibraryName, result.typesReferences);
				break;

			case ModuleType.ShouldBeImported:
				updateImportsForStatement(statement, params, result);
				break;

			case ModuleType.ShouldBeInlined:
				result.statements.push(statement);
				break;
		}
	}
}

function updateResultForRootSourceFile(params: UpdateParams, result: CollectingResult): void {
	function isReExportFromImportableModule(statement: ts.Statement): boolean {
		if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined || !ts.isStringLiteral(statement.moduleSpecifier)) {
			return false;
		}

		const moduleFileName = resolveModuleFileName(statement.getSourceFile().fileName, statement.moduleSpecifier.text);
		return params.getModuleInfo(moduleFileName).type === ModuleType.ShouldBeImported;
	}

	updateResult(params, result);

	// add skipped by `updateResult` exports
	for (const statement of params.statements) {
		// "export default" or "export ="
		const isExportAssignment = ts.isExportAssignment(statement);
		const isReExportFromImportable = isReExportFromImportableModule(statement);

		if (isExportAssignment || isReExportFromImportable) {
			result.statements.push(statement);
		}
	}
}

function updateResultForImportedEqExportAssignment(exportAssignment: ts.ExportAssignment, params: UpdateParams, result: CollectingResult): void {
	const moduleDeclarations = params.getDeclarationsForExportedAssignment(exportAssignment)
		.filter(isNamespaceStatement)
		.filter((s: ts.ModuleDeclaration) => s.getSourceFile() === exportAssignment.getSourceFile());

	// if we have `export =` somewhere so we can decide that every declaration of exported symbol in this way
	// is "part of the exported module" and we need to update result according every member of each declaration
	// but treat they as current module (we do not need to update module info)
	for (const moduleDeclaration of moduleDeclarations) {
		if (moduleDeclaration.body === undefined || !ts.isModuleBlock(moduleDeclaration.body)) {
			continue;
		}

		updateResult(
			{
				...params,
				statements: moduleDeclaration.body.statements,
			},
			result
		);
	}
}

function updateResultForModuleDeclaration(moduleDecl: ts.ModuleDeclaration, params: UpdateParams, result: CollectingResult): void {
	if (moduleDecl.body === undefined || !ts.isModuleBlock(moduleDecl.body)) {
		return;
	}

	const moduleName = moduleDecl.name.text;
	const moduleFileName = resolveModuleFileName(params.currentModule.fileName, moduleName);
	const moduleInfo = params.getModuleInfo(moduleFileName);

	// if we have declaration of external module inside internal one
	// we need to just add it to result without any processing
	if (!params.currentModule.isExternal && moduleInfo.isExternal) {
		result.statements.push(moduleDecl);
		return;
	}

	updateResult(
		{
			...params,
			currentModule: moduleInfo,
			statements: moduleDecl.body.statements,
		},
		result
	);
}

function resolveModuleFileName(currentFileName: string, moduleName: string): string {
	return moduleName.startsWith('.') ? fixPath(path.join(currentFileName, '..', moduleName)) : `node_modules/${moduleName}/`;
}

function addTypesReference(library: string, typesReferences: Set<string>): void {
	if (!typesReferences.has(library)) {
		normalLog(`Library "${library}" will be added via reference directive`);
		typesReferences.add(library);
	}
}

function updateImportsForStatement(statement: ts.Statement, params: UpdateParams, result: CollectingResult): void {
	if (params.currentModule.type !== ModuleType.ShouldBeImported) {
		return;
	}

	const statementsToImport = ts.isVariableStatement(statement) ? statement.declarationList.declarations : [statement];
	for (const statementToImport of statementsToImport) {
		if (params.shouldStatementBeImported(statementToImport as ts.DeclarationStatement)) {
			addImport(statementToImport as ts.DeclarationStatement, params.currentModule.libraryName, result.imports);
		}
	}
}

function addImport(statement: ts.DeclarationStatement, library: string, imports: Map<string, Set<string>>): void {
	if (statement.name === undefined) {
		throw new Error(`Import/usage unnamed declaration: ${statement.getText()}`);
	}

	let libraryImports = imports.get(library);
	if (libraryImports === undefined) {
		libraryImports = new Set<string>();
		imports.set(library, libraryImports);
	}

	const importName = statement.name.getText();
	if (!libraryImports.has(importName)) {
		normalLog(`Adding import with name "${importName}" for library "${library}"`);
		libraryImports.add(importName);
	}
}

function getRootSourceFile(program: ts.Program, rootFileName: string): ts.SourceFile {
	if (program.getRootFileNames().indexOf(rootFileName) === -1) {
		throw new Error(`There is no such root file ${rootFileName}`);
	}

	const sourceFile = program.getSourceFile(rootFileName);
	if (sourceFile === undefined) {
		throw new Error(`Cannot get source file for root file ${rootFileName}`);
	}

	return sourceFile;
}

function isNodeUsed(
	node: ts.Node,
	rootFileExports: ReadonlyArray<ts.Symbol>,
	typesUsageEvaluator: TypesUsageEvaluator,
	typeChecker: ts.TypeChecker
): boolean {
	if (isNodeNamedDeclaration(node)) {
		const nodeSymbol = getNodeSymbol(node, typeChecker);
		if (nodeSymbol === null) {
			return false;
		}

		return rootFileExports.some((rootExport: ts.Symbol) => typesUsageEvaluator.isSymbolUsedBySymbol(nodeSymbol, rootExport));
	} else if (ts.isVariableStatement(node)) {
		return node.declarationList.declarations.some((declaration: ts.VariableDeclaration) => {
			return isNodeUsed(declaration, rootFileExports, typesUsageEvaluator, typeChecker);
		});
	}

	return false;
}

function shouldNodeBeImported(
	node: ts.NamedDeclaration,
	rootFileExports: ReadonlyArray<ts.Symbol>,
	typesUsageEvaluator: TypesUsageEvaluator,
	typeChecker: ts.TypeChecker,
	isDefaultLibrary: (sourceFile: ts.SourceFile) => boolean
): boolean {
	const nodeSymbol = getNodeSymbol(node, typeChecker);
	if (nodeSymbol === null) {
		return false;
	}

	const symbolDeclarations = getDeclarationsForSymbol(nodeSymbol);
	const isSymbolDeclaredInDefaultLibrary = symbolDeclarations.some(
		(declaration: ts.Declaration) => isDefaultLibrary(declaration.getSourceFile())
	);
	if (isSymbolDeclaredInDefaultLibrary) {
		// we shouldn't import a node declared in the default library (such dom, es2015)
		// yeah, actually we should check that node is declared only in the default lib
		// but it seems we can check that at least one declaration is from default lib
		// to treat the node as un-importable
		// because we can't re-export declared somewhere else node with declaration merging

		// also, if some lib file will not be added to the project
		// for example like it is described in the react declaration file (e.g. React Native)
		// then here we still have a bug with "importing global declaration from a package"
		// (see https://github.com/timocov/dts-bundle-generator/issues/71)
		// but I don't think it is a big problem for now
		// and it's possible that it will be fixed in https://github.com/timocov/dts-bundle-generator/issues/59
		return false;
	}

	const symbolsUsingNode = typesUsageEvaluator.getSymbolsUsingSymbol(nodeSymbol);
	if (symbolsUsingNode === null) {
		throw new Error('Something went wrong - value cannot be null');
	}

	// we should import only symbols which are used in types directly
	return Array.from(symbolsUsingNode).some((symbol: ts.Symbol) => {
		const symbolsDeclarations = getDeclarationsForSymbol(symbol);
		if (symbolsDeclarations.length === 0 || symbolsDeclarations.every(isDeclarationFromExternalModule)) {
			return false;
		}

		return rootFileExports.some((rootSymbol: ts.Symbol) => typesUsageEvaluator.isSymbolUsedBySymbol(symbol, rootSymbol));
	});
}

function isSourceFileDefaultLibrary(program: ts.Program, file: ts.SourceFile): boolean {
	interface CompatibilityProgramPart {
		// this method was introduced in TypeScript 2.6
		// but to the public API it was added only in TypeScript 3.0
		// so, to be compiled with TypeScript < 3.0 we need to have this hack
		isSourceFileDefaultLibrary(file: ts.SourceFile): boolean;
	}

	type CommonKeys = keyof (CompatibilityProgramPart | ts.Program);

	// if current ts.Program has isSourceFileDefaultLibrary method - then use it
	// if it does not have it yet - use fallback
	type CompatibleProgram = CommonKeys extends never ? ts.Program & CompatibilityProgramPart : ts.Program;

	// tslint:disable-next-line:no-unnecessary-type-assertion
	return (program as CompatibleProgram).isSourceFileDefaultLibrary(file);
}

function getNodeSymbol(node: ts.NamedDeclaration, typeChecker: ts.TypeChecker): ts.Symbol | null {
	if (node.name === undefined) {
		return null;
	}

	const symbol = typeChecker.getSymbolAtLocation(node.name);
	if (symbol === undefined) {
		return null;
	}

	return getActualSymbol(symbol, typeChecker);
}
