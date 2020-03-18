import * as ts from 'typescript';

import { getLibraryName } from './node-modules';

const namedDeclarationKinds = [
	ts.SyntaxKind.InterfaceDeclaration,
	ts.SyntaxKind.ClassDeclaration,
	ts.SyntaxKind.EnumDeclaration,
	ts.SyntaxKind.TypeAliasDeclaration,
	ts.SyntaxKind.ModuleDeclaration,
	ts.SyntaxKind.FunctionDeclaration,
	ts.SyntaxKind.VariableDeclaration,
];

export function isNodeNamedDeclaration(node: ts.Node): node is ts.NamedDeclaration {
	return namedDeclarationKinds.indexOf(node.kind) !== -1;
}

export function hasNodeModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
	return Boolean(node.modifiers && node.modifiers.some((nodeModifier: ts.Modifier) => nodeModifier.kind === modifier));
}

export function getActualSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): ts.Symbol {
	if (symbol.flags & ts.SymbolFlags.Alias) {
		symbol = typeChecker.getAliasedSymbol(symbol);
	}

	return symbol;
}

/**
 * @see https://github.com/Microsoft/TypeScript/blob/f7c4fefeb62416c311077a699cc15beb211c25c9/src/compiler/utilities.ts#L626-L628
 */
function isGlobalScopeAugmentation(module: ts.ModuleDeclaration): boolean {
	return Boolean(module.flags & ts.NodeFlags.GlobalAugmentation);
}

/**
 * Returns whether node is ambient module declaration (declare module "name" or declare global)
 * @see https://github.com/Microsoft/TypeScript/blob/f7c4fefeb62416c311077a699cc15beb211c25c9/src/compiler/utilities.ts#L588-L590
 */
export function isAmbientModule(node: ts.Node): boolean {
	return ts.isModuleDeclaration(node) && (node.name.kind === ts.SyntaxKind.StringLiteral || isGlobalScopeAugmentation(node));
}

/**
 * Returns whether statement is `declare module` ModuleDeclaration (not `declare global` or `namespace`)
 */
export function isDeclareModuleStatement(statement: ts.Statement): statement is ts.ModuleDeclaration {
	// `declare module ""`, `declare global` and `namespace {}` are ModuleDeclaration
	// but here we need to check only `declare module` statements
	return ts.isModuleDeclaration(statement) && !(statement.flags & ts.NodeFlags.Namespace) && !isGlobalScopeAugmentation(statement);
}

/**
 * Returns whether statement is `declare global` ModuleDeclaration
 */
export function isDeclareGlobalStatement(statement: ts.Statement): statement is ts.ModuleDeclaration {
	return ts.isModuleDeclaration(statement) && isGlobalScopeAugmentation(statement);
}

/**
 * Returns whether node is `namespace` ModuleDeclaration
 */
export function isNamespaceStatement(node: ts.Node): node is ts.ModuleDeclaration {
	return ts.isModuleDeclaration(node) && Boolean(node.flags & ts.NodeFlags.Namespace);
}

export function getDeclarationsForSymbol(symbol: ts.Symbol): ts.Declaration[] {
	const result: ts.Declaration[] = [];

	// Disabling tslint is for backward compat with TypeScript < 3
	// tslint:disable-next-line:strict-type-predicates
	if (symbol.declarations !== undefined) {
		result.push(...symbol.declarations);
	}

	// Disabling tslint is for backward compat with TypeScript < 3
	// tslint:disable-next-line:strict-type-predicates
	if (symbol.valueDeclaration !== undefined) {
		// push valueDeclaration might be already in declarations array
		// so let's check first to avoid duplication nodes
		if (!result.includes(symbol.valueDeclaration)) {
			result.push(symbol.valueDeclaration);
		}
	}

	return result;
}

export function isDeclarationFromExternalModule(node: ts.Declaration): boolean {
	return getLibraryName(node.getSourceFile().fileName) !== null;
}

export const enum ExportType {
	CommonJS,
	ES6Named,
	ES6Default,
}

export interface SourceFileExport {
	symbol: ts.Symbol;
	type: ExportType;
}

export function getExportsForSourceFile(typeChecker: ts.TypeChecker, sourceFileSymbol: ts.Symbol): SourceFileExport[] {
	if (sourceFileSymbol.exports !== undefined) {
		const commonJsExport = sourceFileSymbol.exports.get(ts.InternalSymbolName.ExportEquals);
		if (commonJsExport !== undefined) {
			return [
				{
					symbol: getActualSymbol(commonJsExport, typeChecker),
					type: ExportType.CommonJS,
				},
			];
		}
	}

	const result: SourceFileExport[] = typeChecker
		.getExportsOfModule(sourceFileSymbol)
		.map((symbol: ts.Symbol) => ({ symbol, type: ExportType.ES6Named }));

	if (sourceFileSymbol.exports !== undefined) {
		const defaultExportSymbol = sourceFileSymbol.exports.get(ts.InternalSymbolName.Default);
		if (defaultExportSymbol !== undefined) {
			const defaultExport = result.find((exp: SourceFileExport) => exp.symbol === defaultExportSymbol);
			if (defaultExport !== undefined) {
				defaultExport.type = ExportType.ES6Default;
			} else {
				// it seems that default export is always returned by getExportsOfModule
				// but let's add it to be sure add if there is no such export
				result.push({
					symbol: defaultExportSymbol,
					type: ExportType.ES6Default,
				});
			}
		}
	}

	result.forEach((symbol: SourceFileExport) => {
		symbol.symbol = getActualSymbol(symbol.symbol, typeChecker);
	});

	return result;
}

export function getExportTypeForDeclaration(
	exportedSymbols: ReadonlyArray<SourceFileExport>,
	typeChecker: ts.TypeChecker,
	declaration: ts.NamedDeclaration | ts.VariableStatement
): ExportType | null {
	if (ts.isVariableStatement(declaration)) {
		if (declaration.declarationList.declarations.length === 0) {
			return null;
		}

		const firstDeclarationExportType = getExportTypeForName(
			exportedSymbols,
			typeChecker,
			declaration.declarationList.declarations[0].name
		);

		const allDeclarationsHaveSameExportType = declaration.declarationList.declarations.every((variableDecl: ts.VariableDeclaration) => {
			// all declaration should have the same export type
			// TODO: for now it's not supported to have different type of exports
			return getExportTypeForName(exportedSymbols, typeChecker, variableDecl.name) === firstDeclarationExportType;
		});

		if (!allDeclarationsHaveSameExportType) {
			// log warn?
			return null;
		}

		return firstDeclarationExportType;
	}

	return getExportTypeForName(exportedSymbols, typeChecker, declaration.name);
}

function getExportTypeForName(
	exportedSymbols: ReadonlyArray<SourceFileExport>,
	typeChecker: ts.TypeChecker,
	name: ts.NamedDeclaration['name']
): ExportType | null {
	if (name === undefined) {
		return null;
	}

	if (ts.isArrayBindingPattern(name) || ts.isObjectBindingPattern(name)) {
		// TODO: binding patterns in variable declarations are not supported for now
		// see https://github.com/microsoft/TypeScript/issues/30598 also
		return null;
	}

	const declarationSymbol = typeChecker.getSymbolAtLocation(name);
	const exportedSymbol = exportedSymbols.find((rootExport: SourceFileExport) => rootExport.symbol === declarationSymbol);
	if (exportedSymbol === undefined) {
		return null;
	}

	return exportedSymbol.type;
}
