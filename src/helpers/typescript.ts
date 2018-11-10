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
 * Returns whether statement is `declare module` ModuleDeclaration (not `declare global` or `namespace`)
 */
export function isDeclareModuleStatement(statement: ts.Statement): statement is ts.ModuleDeclaration {
	// `declare module ""`, `declare global` and `namespace {}` are ModuleDeclaration
	// but here we need to check only `declare module` statements
	return ts.isModuleDeclaration(statement) && !(statement.flags & ts.NodeFlags.Namespace) && !(statement.flags & ts.NodeFlags.GlobalAugmentation);
}

/**
 * Returns whether statement is `declare global` ModuleDeclaration
 */
export function isDeclareGlobalStatement(statement: ts.Statement): statement is ts.ModuleDeclaration {
	return ts.isModuleDeclaration(statement) && Boolean(statement.flags & ts.NodeFlags.GlobalAugmentation);
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
	if (symbol.valueDeclaration !== undefined) {
		result.push(symbol.valueDeclaration);
	}

	// Disabling tslint is for backward compat with TypeScript < 3
	// tslint:disable-next-line:strict-type-predicates
	if (symbol.declarations !== undefined) {
		result.push(...symbol.declarations);
	}

	return result;
}

export function isDeclarationFromExternalModule(node: ts.Declaration): boolean {
	return getLibraryName(node.getSourceFile().fileName) !== null;
}
