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
	ts.SyntaxKind.PropertySignature,
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

export function splitTransientSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): ts.Symbol[] {
	// actually I think we even don't need to operate/use "Transient" symbols anywhere
	// it's kind of aliased symbol, but just merged
	// but it's hard to refractor everything to use array of symbols instead of just symbol
	// so let's fix it for some places
	if ((symbol.flags & ts.SymbolFlags.Transient) === 0) {
		return [symbol];
	}

	// "Transient" symbol is kinda "merged" symbol
	// I don't really know is this way to "split" is correct
	// but it seems that it works for now ¯\_(ツ)_/¯
	const declarations = getDeclarationsForSymbol(symbol);
	const result: ts.Symbol[] = [];
	for (const declaration of declarations) {
		if (!isNodeNamedDeclaration(declaration) || declaration.name === undefined) {
			continue;
		}

		const symbol = typeChecker.getSymbolAtLocation(declaration.name);
		if (symbol === undefined) {
			continue;
		}

		result.push(getActualSymbol(symbol, typeChecker));
	}

	return result;
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
	exportedName: string;
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
					exportedName: '',
				},
			];
		}
	}

	const result: SourceFileExport[] = typeChecker
		.getExportsOfModule(sourceFileSymbol)
		.map((symbol: ts.Symbol) => ({ symbol, exportedName: symbol.escapedName as string, type: ExportType.ES6Named }));

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
					exportedName: 'default',
				});
			}
		}
	}

	result.forEach((symbol: SourceFileExport) => {
		symbol.symbol = getActualSymbol(symbol.symbol, typeChecker);
	});

	return result;
}

export function getExportsForStatement(
	exportedSymbols: ReadonlyArray<SourceFileExport>,
	typeChecker: ts.TypeChecker,
	statement: ts.Statement
): SourceFileExport[] {
	if (ts.isVariableStatement(statement)) {
		if (statement.declarationList.declarations.length === 0) {
			return [];
		}

		const firstDeclarationExports = getExportsForName(
			exportedSymbols,
			typeChecker,
			statement.declarationList.declarations[0].name
		);

		const allDeclarationsHaveSameExportType = statement.declarationList.declarations.every((variableDecl: ts.VariableDeclaration) => {
			// all declaration should have the same export type
			// TODO: for now it's not supported to have different type of exports
			return getExportsForName(exportedSymbols, typeChecker, variableDecl.name)[0] === firstDeclarationExports[0];
		});

		if (!allDeclarationsHaveSameExportType) {
			// log warn?
			return [];
		}

		return firstDeclarationExports;
	}

	return getExportsForName(exportedSymbols, typeChecker, (statement as unknown as ts.NamedDeclaration).name);
}

function getExportsForName(
	exportedSymbols: ReadonlyArray<SourceFileExport>,
	typeChecker: ts.TypeChecker,
	name: ts.NamedDeclaration['name']
): SourceFileExport[] {
	if (name === undefined) {
		return [];
	}

	if (ts.isArrayBindingPattern(name) || ts.isObjectBindingPattern(name)) {
		// TODO: binding patterns in variable declarations are not supported for now
		// see https://github.com/microsoft/TypeScript/issues/30598 also
		return [];
	}

	const declarationSymbol = typeChecker.getSymbolAtLocation(name);
	return exportedSymbols.filter((rootExport: SourceFileExport) => rootExport.symbol === declarationSymbol);
}
