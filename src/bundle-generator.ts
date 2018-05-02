import * as ts from 'typescript';
import * as path from 'path';

import { compileDts } from './compile-dts';
import { TypesUsageEvaluator } from './types-usage-evaluator';
import {
	getActualSymbol,
	hasNodeModifier,
	isDeclareModuleStatement,
	isNodeNamedDeclaration,
} from './typescript-helpers';

import { getLibraryName } from './node-modules-helpers';

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
	inlinedLibraries?: string[];
	importedLibraries?: string[];
	allowedTypesLibraries?: string[];
	umdModuleName?: string;
	preferredConfigPath?: string;
}

const skippedNodes = [
	ts.SyntaxKind.ExportDeclaration,
	ts.SyntaxKind.ImportDeclaration,
	ts.SyntaxKind.ImportEqualsDeclaration,
];

export function generateDtsBundle(filePath: string, options: GenerationOptions = {}): string {
	const criteria: ModuleCriteria = {
		allowedTypesLibraries: options.allowedTypesLibraries,
		importedLibraries: options.importedLibraries,
		inlinedLibraries: options.inlinedLibraries || [],
	};

	if (!ts.sys.fileExists(filePath)) {
		throw new Error(`File "${filePath}" does not exist`);
	}

	const program = compileDts(filePath, options.preferredConfigPath);
	const typeChecker = program.getTypeChecker();

	const sourceFiles = program.getSourceFiles().filter((file: ts.SourceFile) => {
		return getModuleInfo(file.fileName, criteria).type !== ModuleType.ShouldNotBeUsed;
	});

	verboseLog(`Input source files:\n  ${sourceFiles.map((file: ts.SourceFile) => file.fileName).join('\n  ')}`);

	const typesUsageEvaluator = new TypesUsageEvaluator(sourceFiles, typeChecker);

	const rootSourceFile = getRootSourceFile(program);
	const rootSourceFileSymbol = typeChecker.getSymbolAtLocation(rootSourceFile);
	if (rootSourceFileSymbol === undefined) {
		throw new Error('Symbol for root source file not found');
	}

	const rootFileExports = typeChecker.getExportsOfModule(rootSourceFileSymbol).map((symbol: ts.Symbol) => getActualSymbol(symbol, typeChecker));

	const collectionResult: CollectingResult = {
		typesReferences: new Set<string>(),
		imports: new Map<string, Set<string>>(),
		statements: [],
	};

	for (const sourceFile of sourceFiles) {
		verboseLog(`\n\n======= Preparing file: ${sourceFile.fileName} =======`);

		const prevStatementsCount = collectionResult.statements.length;
		updateResult(
			{
				currentModule: getModuleInfo(sourceFile.fileName, criteria),
				statements: sourceFile.statements,
				isStatementUsed: (statement: ts.Statement) => isNodeUsed(statement, rootFileExports, typesUsageEvaluator, typeChecker),
				shouldStatementBeImported: (statement: ts.DeclarationStatement) => shouldNodeBeImported(statement, rootFileExports, typesUsageEvaluator),
				getModuleInfo: (fileName: string) => getModuleInfo(fileName, criteria),
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

	for (const statement of rootSourceFile.statements) {
		// add skipped by `updateResult` `export default` from root file if present
		if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
			collectionResult.statements.push(statement);
		}
	}

	return generateOutput(
		{
			...collectionResult,
			needStripDefaultKeywordForStatement: (statement: ts.Statement) => statement.getSourceFile() !== rootSourceFile,
			shouldStatementHasExportKeyword: (statement: ts.Statement) => {
				let result = true;

				if (ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) {
					// not every class and enum can be exported (only exported from root file can)
					result = isDeclarationExported(rootFileExports, typeChecker, statement);
					if (ts.isEnumDeclaration(statement)) {
						// const enum always can be exported
						result = result || hasNodeModifier(statement, ts.SyntaxKind.ConstKeyword);
					}
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
	getModuleInfo(fileName: string): ModuleInfo;
}

function updateResult(params: UpdateParams, result: CollectingResult): void {
	if (params.currentModule.type === ModuleType.ShouldNotBeUsed) {
		return;
	}

	for (const statement of params.statements) {
		// we should skip import and exports statements
		if (skippedNodes.indexOf(statement.kind) !== -1) {
			continue;
		}

		if (isDeclareModuleStatement(statement)) {
			if (statement.body !== undefined && ts.isModuleBlock(statement.body)) {
				const moduleName = statement.name.text;
				const moduleFileName = resolveModuleFileName(params.currentModule.fileName, moduleName);
				updateResult(
					{
						...params,
						currentModule: params.getModuleInfo(moduleFileName),
						statements: statement.body.statements,
					},
					result
				);
			}

			continue;
		}

		if (!params.isStatementUsed(statement)) {
			verboseLog(`Skip file member: ${statement.getText().replace(/(\n|\r)/g, '').slice(0, 50)}...`);
			continue;
		}

		if (params.currentModule.type === ModuleType.ShouldBeReferencedAsTypes) {
			addTypesReference(params.currentModule.typesLibraryName, result.typesReferences);
			break;
		} else if (params.currentModule.type === ModuleType.ShouldBeImported) {
			if (params.shouldStatementBeImported(statement as ts.DeclarationStatement)) {
				addImport(statement as ts.DeclarationStatement, params.currentModule.libraryName, result.imports);
			}
		} else if (params.currentModule.type === ModuleType.ShouldBeInlined) {
			result.statements.push(statement);
		}
	}
}

function resolveModuleFileName(currentFileName: string, moduleName: string): string {
	return moduleName.startsWith('.') ? path.resolve(currentFileName, '..', moduleName) : `node_modules/${moduleName}/`;
}

function addTypesReference(library: string, typesReferences: Set<string>): void {
	if (!typesReferences.has(library)) {
		normalLog(`Library "${library}" will be added via reference directive`);
		typesReferences.add(library);
	}
}

function addImport(statement: ts.DeclarationStatement, library: string, imports: Map<string, Set<string>>): void {
	if (statement.name === undefined) {
		throw new Error(`Import/usage unnamed declaration: ${statement.getText()}`);
	}

	const importName = statement.name.getText();
	normalLog(`Adding import with name "${importName}" for library "${library}"`);

	let libraryImports = imports.get(library);
	if (libraryImports === undefined) {
		libraryImports = new Set<string>();
		imports.set(library, libraryImports);
	}

	libraryImports.add(importName);
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

function isDeclarationExported(exportedSymbols: ReadonlyArray<ts.Symbol>, typeChecker: ts.TypeChecker, declaration: ts.NamedDeclaration): boolean {
	if (declaration.name === undefined) {
		return false;
	}

	const declarationSymbol = typeChecker.getSymbolAtLocation(declaration.name);
	return exportedSymbols.some((rootExport: ts.Symbol) => rootExport === declarationSymbol);
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
			return isDeclarationExported(rootFileExports, typeChecker, declaration);
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
		if (symbol.valueDeclaration === undefined && symbol.declarations === undefined) {
			return false;
		} else if (symbol.valueDeclaration !== undefined && isDeclarationFromExternalModule(symbol.valueDeclaration)) {
			return false;
		} else if (symbol.declarations !== undefined && symbol.declarations.every(isDeclarationFromExternalModule)) {
			return false;
		}

		return rootFileExports.some((rootSymbol: ts.Symbol) => typesUsageEvaluator.isSymbolUsedBySymbol(symbol, rootSymbol));
	});
}

function isDeclarationFromExternalModule(node: ts.Declaration): boolean {
	return getLibraryName(node.getSourceFile().fileName) !== null;
}
