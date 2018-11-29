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
	isDeclarationFromExternalModule,
	isDeclareGlobalStatement,
	isDeclareModuleStatement,
	isNamespaceStatement,
	isNodeNamedDeclaration,
	SourceFileExport,
} from './helpers/typescript';

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

export interface GenerationOptions {
	failOnClass?: boolean;
	sortNodes?: boolean;
	inlineDeclareGlobals?: boolean;
	inlinedLibraries?: string[];
	importedLibraries?: string[];
	allowedTypesLibraries?: string[];
	umdModuleName?: string;
	preferredConfigPath?: string;
	followSymlinks?: boolean;
}

export function generateDtsBundle(filePath: string, options: GenerationOptions = {}): string {
	if (!ts.sys.fileExists(filePath)) {
		throw new Error(`File "${filePath}" does not exist`);
	}

	const program = compileDts(filePath, options.preferredConfigPath, options.followSymlinks);
	const typeChecker = program.getTypeChecker();

	const criteria: ModuleCriteria = {
		allowedTypesLibraries: options.allowedTypesLibraries,
		importedLibraries: options.importedLibraries,
		inlinedLibraries: options.inlinedLibraries || [],
		typeRoots: ts.getEffectiveTypeRoots(program.getCompilerOptions(), {}),
	};

	const sourceFiles = program.getSourceFiles().filter((file: ts.SourceFile) => {
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
		return !(program as CompatibleProgram).isSourceFileDefaultLibrary(file);
	});

	verboseLog(`Input source files:\n  ${sourceFiles.map((file: ts.SourceFile) => file.fileName).join('\n  ')}`);

	const typesUsageEvaluator = new TypesUsageEvaluator(sourceFiles, typeChecker);

	const rootSourceFile = getRootSourceFile(program);
	const rootSourceFileSymbol = typeChecker.getSymbolAtLocation(rootSourceFile);
	if (rootSourceFileSymbol === undefined) {
		throw new Error('Symbol for root source file not found');
	}

	const rootFileExports = getExportsForSourceFile(typeChecker, rootSourceFileSymbol);
	const rootFileExportSymbols = rootFileExports.map((exp: SourceFileExport) => exp.symbol);

	const collectionResult: CollectingResult = {
		typesReferences: new Set<string>(),
		imports: new Map<string, Set<string>>(),
		statements: [],
	};

	const updateResultCommonParams = {
		isStatementUsed: (statement: ts.Statement) => isNodeUsed(statement, rootFileExportSymbols, typesUsageEvaluator, typeChecker),
		shouldStatementBeImported: (statement: ts.DeclarationStatement) => shouldNodeBeImported(statement, rootFileExportSymbols, typesUsageEvaluator),
		shouldDeclareGlobalBeInlined: (currentModule: ModuleInfo) => Boolean(options.inlineDeclareGlobals) && currentModule.type === ModuleType.ShouldBeInlined,
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

	if (options.failOnClass) {
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
				} else if (isDeclareGlobalStatement(statement) || ts.isExportDeclaration(statement)) {
					result = false;
				}

				return result;
			},
		},
		{
			sortStatements: options.sortNodes,
			umdModuleName: options.umdModuleName,
		}
	);
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
	return moduleName.startsWith('.') ? path.join(currentFileName, '..', moduleName) : `node_modules/${moduleName}/`;
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

function getRootSourceFile(program: ts.Program): ts.SourceFile {
	const rootFiles = program.getRootFileNames();
	if (rootFiles.length !== 1) {
		verboseLog(`Root files:\n  ${rootFiles.join('\n  ')}`);
		throw new Error(`There is not one root file - ${rootFiles.length}`);
	}

	const sourceFileName = rootFiles[0];
	const sourceFile = program.getSourceFile(sourceFileName);
	if (sourceFile === undefined) {
		throw new Error(`Cannot get source file for root file ${sourceFileName}`);
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
		return rootFileExports.some((rootExport: ts.Symbol) => typesUsageEvaluator.isTypeUsedBySymbol(node, rootExport));
	} else if (ts.isVariableStatement(node)) {
		return node.declarationList.declarations.some((declaration: ts.VariableDeclaration) => {
			return isNodeUsed(declaration, rootFileExports, typesUsageEvaluator, typeChecker);
		});
	}

	return false;
}

function shouldNodeBeImported(node: ts.NamedDeclaration, rootFileExports: ReadonlyArray<ts.Symbol>, typesUsageEvaluator: TypesUsageEvaluator): boolean {
	const symbolsUsingNode = typesUsageEvaluator.getSymbolsUsingNode(node as ts.DeclarationStatement);
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
