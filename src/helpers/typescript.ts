import * as ts from 'typescript';

import { warnLog } from '../logger';

const namedDeclarationKinds = [
	ts.SyntaxKind.InterfaceDeclaration,
	ts.SyntaxKind.ClassDeclaration,
	ts.SyntaxKind.EnumDeclaration,
	ts.SyntaxKind.TypeAliasDeclaration,
	ts.SyntaxKind.ModuleDeclaration,
	ts.SyntaxKind.FunctionDeclaration,
	ts.SyntaxKind.VariableDeclaration,
	ts.SyntaxKind.PropertySignature,
	ts.SyntaxKind.NamespaceExport,
	ts.SyntaxKind.NamespaceImport,
	ts.SyntaxKind.ExportSpecifier,
	ts.SyntaxKind.BindingElement,
];

export type NodeName = ts.DeclarationName | ts.DefaultKeyword | ts.QualifiedName | ts.PropertyAccessExpression | ts.BindingPattern;

export function isNodeNamedDeclaration(node: ts.Node): node is ts.NamedDeclaration {
	return namedDeclarationKinds.indexOf(node.kind) !== -1;
}

export function hasNodeModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
	const modifiers = getModifiers(node);
	return Boolean(modifiers && modifiers.some((nodeModifier: ts.Modifier) => nodeModifier.kind === modifier));
}

export function getNodeName(node: ts.Node): NodeName | undefined {
	const nodeName = (node as unknown as ts.NamedDeclaration).name;
	if (nodeName === undefined) {
		const modifiers = getModifiers(node);
		const defaultModifier = modifiers?.find((mod: ts.Modifier) => mod.kind === ts.SyntaxKind.DefaultKeyword);
		if (defaultModifier !== undefined) {
			return defaultModifier as NodeName;
		}
	}

	return nodeName;
}

interface TypeCheckerCompat extends ts.TypeChecker {
	// this method will be added in the further typescript releases
	// see https://github.com/microsoft/TypeScript/pull/56193
	getMergedSymbol(symbol: ts.Symbol): ts.Symbol;
}

export function getActualSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): ts.Symbol {
	if (symbol.flags & ts.SymbolFlags.Alias) {
		symbol = typeChecker.getAliasedSymbol(symbol);
	}

	return (typeChecker as TypeCheckerCompat).getMergedSymbol(symbol);
}

export function getDeclarationNameSymbol(name: NodeName, typeChecker: ts.TypeChecker): ts.Symbol | null {
	const symbol = typeChecker.getSymbolAtLocation(name);
	if (symbol === undefined) {
		return null;
	}

	return getActualSymbol(symbol, typeChecker);
}

export function splitTransientSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): Set<ts.Symbol> {
	// actually I think we even don't need to operate/use "Transient" symbols anywhere
	// it's kind of aliased symbol, but just merged
	// but it's hard to refractor everything to use array of symbols instead of just symbol
	// so let's fix it for some places
	if ((symbol.flags & ts.SymbolFlags.Transient) === 0) {
		return new Set([symbol]);
	}

	// "Transient" symbol is kinda "merged" symbol
	// I don't really know is this way to "split" is correct
	// but it seems that it works for now ¯\_(ツ)_/¯
	const declarations = getDeclarationsForSymbol(symbol);
	const result = new Set<ts.Symbol>();
	for (const declaration of declarations) {
		if (!isNodeNamedDeclaration(declaration) || declaration.name === undefined) {
			continue;
		}

		const sym = typeChecker.getSymbolAtLocation(declaration.name);
		if (sym === undefined) {
			continue;
		}

		result.add(getActualSymbol(sym, typeChecker));
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
 * Returns whether node is `declare module` ModuleDeclaration (not `declare global` or `namespace`)
 */
export function isDeclareModule(node: ts.Node): node is ts.ModuleDeclaration {
	// `declare module ""`, `declare global` and `namespace {}` are ModuleDeclaration
	// but here we need to check only `declare module` statements
	return ts.isModuleDeclaration(node) && !(node.flags & ts.NodeFlags.Namespace) && !isGlobalScopeAugmentation(node);
}

/**
 * Returns whether statement is `declare global` ModuleDeclaration
 */
export function isDeclareGlobalStatement(statement: ts.Statement): statement is ts.ModuleDeclaration {
	return ts.isModuleDeclaration(statement) && isGlobalScopeAugmentation(statement);
}

export function getDeclarationsForSymbol(symbol: ts.Symbol): ts.Declaration[] {
	const result: ts.Declaration[] = [];

	if (symbol.declarations !== undefined) {
		result.push(...symbol.declarations);
	}

	if (symbol.valueDeclaration !== undefined) {
		// push valueDeclaration might be already in declarations array
		// so let's check first to avoid duplication nodes
		if (!result.includes(symbol.valueDeclaration)) {
			result.push(symbol.valueDeclaration);
		}
	}

	return result;
}

export const enum ExportType {
	CommonJS,
	ES6Named,
	ES6Default,
}

export interface SourceFileExport {
	exportedName: string;
	symbol: ts.Symbol;
	originalSymbol: ts.Symbol;
	type: ExportType;
}

export function getExportsForSourceFile(typeChecker: ts.TypeChecker, sourceFileSymbol: ts.Symbol): SourceFileExport[] {
	if (sourceFileSymbol.exports !== undefined) {
		const commonJsExport = sourceFileSymbol.exports.get(ts.InternalSymbolName.ExportEquals);
		if (commonJsExport !== undefined) {
			const symbol = getActualSymbol(commonJsExport, typeChecker);
			return [
				{
					symbol,
					originalSymbol: commonJsExport,
					type: ExportType.CommonJS,
					exportedName: '',
				},
			];
		}
	}

	const result = typeChecker
		.getExportsOfModule(sourceFileSymbol)
		.map<SourceFileExport>((symbol: ts.Symbol) => ({ symbol, originalSymbol: symbol, exportedName: symbol.name, type: ExportType.ES6Named }));

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
					originalSymbol: defaultExportSymbol,
					type: ExportType.ES6Default,
					exportedName: 'default',
				});
			}
		}
	}

	const symbolsMergingResolvedExports: SourceFileExport[] = [];

	result.forEach((exp: SourceFileExport) => {
		exp.symbol = getActualSymbol(exp.symbol, typeChecker);

		const symbolsDeclarations = getDeclarationsForSymbol(exp.symbol);
		const importSpecifierDeclaration = symbolsDeclarations.find(ts.isImportSpecifier);
		if (symbolsDeclarations.length > 1 && importSpecifierDeclaration !== undefined) {
			// most likely this export is part of the symbol merging situation
			// where one of the declarations is the imported value but the other is declared locally
			// in this case we need to add an extra export to the exports list to make sure that it is marked as "exported"
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			const referencedModule = resolveReferencedModule(importSpecifierDeclaration.parent.parent.parent as ts.ImportDeclaration, typeChecker);
			if (referencedModule !== null) {
				const referencedModuleSymbol = getNodeSymbol(referencedModule, typeChecker);
				if (referencedModuleSymbol !== null) {
					const importedName = (importSpecifierDeclaration.propertyName ?? importSpecifierDeclaration.name).getText();
					const exportedItemSymbol = typeChecker.getExportsOfModule(referencedModuleSymbol).find((exportSymbol: ts.Symbol) => exportSymbol.getName() === importedName);
					if (exportedItemSymbol !== undefined) {
						symbolsMergingResolvedExports.push({
							...exp,
							symbol: getActualSymbol(exportedItemSymbol, typeChecker),
						});
					}
				}
			}
		}
	});

	return [...result, ...symbolsMergingResolvedExports];
}

export function resolveIdentifier(typeChecker: ts.TypeChecker, identifier: ts.Identifier): ts.NamedDeclaration | undefined {
	const symbol = getDeclarationNameSymbol(identifier, typeChecker);
	if (symbol === null) {
		return undefined;
	}

	return resolveDeclarationByIdentifierSymbol(symbol);
}

function resolveDeclarationByIdentifierSymbol(identifierSymbol: ts.Symbol): ts.NamedDeclaration | undefined {
	const declarations = getDeclarationsForSymbol(identifierSymbol);
	if (declarations.length === 0) {
		return undefined;
	}

	const decl = declarations[0];
	if (!isNodeNamedDeclaration(decl)) {
		return undefined;
	}

	return decl;
}

export function getExportsForStatement(
	exportedSymbols: readonly SourceFileExport[],
	typeChecker: ts.TypeChecker,
	statement: ts.Statement | ts.NamedDeclaration
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
			return getExportsForName(exportedSymbols, typeChecker, variableDecl.name)[0]?.type === firstDeclarationExports[0]?.type;
		});

		if (!allDeclarationsHaveSameExportType) {
			// log warn?
			return [];
		}

		return firstDeclarationExports;
	}

	const nodeName = getNodeName(statement);
	if (nodeName === undefined) {
		return [];
	}

	return getExportsForName(exportedSymbols, typeChecker, nodeName);
}

function getExportsForName(
	exportedSymbols: readonly SourceFileExport[],
	typeChecker: ts.TypeChecker,
	name: NodeName
): SourceFileExport[] {
	if (ts.isArrayBindingPattern(name) || ts.isObjectBindingPattern(name)) {
		// TODO: binding patterns in variable declarations are not supported for now
		// see https://github.com/microsoft/TypeScript/issues/30598 also
		return [];
	}

	const declarationSymbol = typeChecker.getSymbolAtLocation(name);
	return exportedSymbols.filter((rootExport: SourceFileExport) => rootExport.symbol === declarationSymbol);
}

export type ModifiersMap = Record<ts.ModifierSyntaxKind, boolean>;

const modifiersPriority: Partial<Record<ts.ModifierSyntaxKind, number>> = {
	[ts.SyntaxKind.ExportKeyword]: 4,
	[ts.SyntaxKind.DefaultKeyword]: 3,
	[ts.SyntaxKind.DeclareKeyword]: 2,

	[ts.SyntaxKind.AsyncKeyword]: 1,
	[ts.SyntaxKind.ConstKeyword]: 1,
};

export function modifiersToMap(modifiers: (readonly ts.Modifier[]) | undefined | null): ModifiersMap {
	modifiers = modifiers || [];

	return modifiers.reduce(
		(result: ModifiersMap, modifier: ts.Modifier) => {
			result[modifier.kind] = true;
			return result;
		},
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		{} as Record<ts.ModifierSyntaxKind, boolean>
	);
}

export function modifiersMapToArray(modifiersMap: ModifiersMap): ts.Modifier[] {
	return Object.entries(modifiersMap)
		.filter(([kind, include]) => include)
		.map(([kind]) => {
			// we don't care about decorators here as it is not possible to have them in declaration files
			return ts.factory.createModifier(Number(kind));
		})
		.sort((a: ts.Modifier, b: ts.Modifier) => {
			// note `|| 0` is here as a fallback in the case if the compiler adds a new modifier
			// but the tool isn't updated yet
			const aValue = modifiersPriority[a.kind as ts.ModifierSyntaxKind] || 0;
			const bValue = modifiersPriority[b.kind as ts.ModifierSyntaxKind] || 0;
			return bValue - aValue;
		});
}

export function recreateRootLevelNodeWithModifiers(node: ts.Node, modifiersMap: ModifiersMap, newName?: string, keepComments: boolean = true): ts.Node {
	const newNode = recreateRootLevelNodeWithModifiersImpl(node, modifiersMap, newName);

	if (keepComments) {
		ts.setCommentRange(newNode, ts.getCommentRange(node));
	}

	return newNode;
}

// eslint-disable-next-line complexity
function recreateRootLevelNodeWithModifiersImpl(node: ts.Node, modifiersMap: ModifiersMap, newName?: string): ts.Node {
	const modifiers = modifiersMapToArray(modifiersMap);

	if (ts.isArrowFunction(node)) {
		return ts.factory.createArrowFunction(
			modifiers,
			node.typeParameters,
			node.parameters,
			node.type,
			node.equalsGreaterThanToken,
			node.body
		);
	}

	if (ts.isClassDeclaration(node)) {
		return ts.factory.createClassDeclaration(
			modifiers,
			newName || node.name,
			node.typeParameters,
			node.heritageClauses,
			node.members
		);
	}

	if (ts.isClassExpression(node)) {
		return ts.factory.createClassExpression(
			modifiers,
			newName || node.name,
			node.typeParameters,
			node.heritageClauses,
			node.members
		);
	}

	if (ts.isEnumDeclaration(node)) {
		return ts.factory.createEnumDeclaration(
			modifiers,
			newName || node.name,
			node.members
		);
	}

	if (ts.isExportAssignment(node)) {
		return ts.factory.createExportAssignment(
			modifiers,
			node.isExportEquals,
			node.expression
		);
	}

	if (ts.isExportDeclaration(node)) {
		interface Ts53CompatExportDeclaration extends ts.ExportDeclaration {
			attributes?: ts.ExportDeclaration['assertClause'];
		}

		return ts.factory.createExportDeclaration(
			modifiers,
			node.isTypeOnly,
			node.exportClause,
			node.moduleSpecifier,
			// eslint-disable-next-line deprecation/deprecation
			(node as Ts53CompatExportDeclaration).attributes || node.assertClause
		);
	}

	if (ts.isFunctionDeclaration(node)) {
		return ts.factory.createFunctionDeclaration(
			modifiers,
			node.asteriskToken,
			newName || node.name,
			node.typeParameters,
			node.parameters,
			node.type,
			node.body
		);
	}

	if (ts.isFunctionExpression(node)) {
		return ts.factory.createFunctionExpression(
			modifiers,
			node.asteriskToken,
			newName || node.name,
			node.typeParameters,
			node.parameters,
			node.type,
			node.body
		);
	}

	if (ts.isImportDeclaration(node)) {
		interface Ts53CompatImportDeclaration extends ts.ImportDeclaration {
			attributes?: ts.ImportDeclaration['assertClause'];
		}

		return ts.factory.createImportDeclaration(
			modifiers,
			node.importClause,
			node.moduleSpecifier,
			// eslint-disable-next-line deprecation/deprecation
			(node as Ts53CompatImportDeclaration).attributes || node.assertClause
		);
	}

	if (ts.isImportEqualsDeclaration(node)) {
		return ts.factory.createImportEqualsDeclaration(
			modifiers,
			node.isTypeOnly,
			newName || node.name,
			node.moduleReference
		);
	}

	if (ts.isInterfaceDeclaration(node)) {
		return ts.factory.createInterfaceDeclaration(
			modifiers,
			newName || node.name,
			node.typeParameters,
			node.heritageClauses,
			node.members
		);
	}

	if (ts.isModuleDeclaration(node)) {
		return ts.factory.createModuleDeclaration(
			modifiers,
			node.name,
			node.body,
			node.flags
		);
	}

	if (ts.isTypeAliasDeclaration(node)) {
		return ts.factory.createTypeAliasDeclaration(
			modifiers,
			newName || node.name,
			node.typeParameters,
			node.type
		);
	}

	if (ts.isVariableStatement(node)) {
		return ts.factory.createVariableStatement(
			modifiers,
			node.declarationList
		);
	}

	throw new Error(`Unknown top-level node kind (with modifiers): ${ts.SyntaxKind[node.kind]}.
If you're seeing this error, please report a bug on https://github.com/timocov/dts-bundle-generator/issues`);
}

export function getModifiers(node: ts.Node): readonly ts.Modifier[] | undefined {
	if (!ts.canHaveModifiers(node)) {
		return undefined;
	}

	return ts.getModifiers(node);
}

export function getRootSourceFile(program: ts.Program, rootFileName: string): ts.SourceFile {
	if (program.getRootFileNames().indexOf(rootFileName) === -1) {
		throw new Error(`There is no such root file ${rootFileName}`);
	}

	const sourceFile = program.getSourceFile(rootFileName);
	if (sourceFile === undefined) {
		throw new Error(`Cannot get source file for root file ${rootFileName}`);
	}

	return sourceFile;
}

export function getNodeOwnSymbol(node: ts.Node, typeChecker: ts.TypeChecker): ts.Symbol {
	const nodeSymbol = typeChecker.getSymbolAtLocation(node);
	if (nodeSymbol === undefined) {
		throw new Error(`Cannot find symbol for node "${node.getText()}" in "${node.parent.getText()}" from "${node.getSourceFile().fileName}"`);
	}

	return nodeSymbol;
}

export function getNodeSymbol(node: ts.Node, typeChecker: ts.TypeChecker): ts.Symbol | null {
	if (ts.isSourceFile(node)) {
		const fileSymbol = typeChecker.getSymbolAtLocation(node);
		// a source file might not have a symbol in case of no exports in that file
		if (fileSymbol === undefined) {
			return null;
		}

		return getActualSymbol(fileSymbol, typeChecker);
	}

	const nodeName = getNodeName(node);
	if (nodeName === undefined) {
		return null;
	}

	return getDeclarationNameSymbol(nodeName, typeChecker);
}

export function getClosestModuleLikeNode(node: ts.Node): ts.SourceFile | ts.ModuleDeclaration {
	// we need to find a module block and return its module declaration
	// we don't need to handle empty modules/modules with jsdoc/etc
	while (!ts.isModuleBlock(node) && !ts.isSourceFile(node)) {
		node = node.parent;
	}

	return ts.isSourceFile(node) ? node : node.parent;
}

export function getClosestSourceFileLikeNode(node: ts.Node): ts.SourceFile | ts.ModuleDeclaration {
	// we need to find a module block and return its module declaration
	// we don't need to handle empty modules/modules with jsdoc/etc
	while (!(ts.isModuleBlock(node) && ts.isStringLiteral(node.parent.name)) && !ts.isSourceFile(node)) {
		node = node.parent;
	}

	return ts.isSourceFile(node) ? node : node.parent;
}

export type NodeWithReferencedModule =
	| ts.ExportDeclaration
	| ts.ImportDeclaration
	| ts.ImportEqualsDeclaration
	| ts.ImportTypeNode
	| ts.ModuleDeclaration
	;

export function resolveReferencedModule(node: NodeWithReferencedModule, typeChecker: ts.TypeChecker): ts.SourceFile | ts.ModuleDeclaration | null {
	let moduleName: ts.Expression | ts.LiteralTypeNode | undefined;

	if (ts.isExportDeclaration(node) || ts.isImportDeclaration(node)) {
		moduleName = node.moduleSpecifier;
	} else if (ts.isModuleDeclaration(node)) {
		moduleName = node.name;
	} else if (ts.isImportEqualsDeclaration(node)) {
		if (ts.isExternalModuleReference(node.moduleReference)) {
			moduleName = node.moduleReference.expression;
		}
	} else if (ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
		moduleName = node.argument.literal;
	}

	if (moduleName === undefined) {
		return null;
	}

	const moduleSymbol = typeChecker.getSymbolAtLocation(moduleName);
	if (moduleSymbol === undefined) {
		return null;
	}

	const symbol = getActualSymbol(moduleSymbol, typeChecker);
	if (symbol.valueDeclaration === undefined) {
		return null;
	}

	return ts.isSourceFile(symbol.valueDeclaration) || ts.isModuleDeclaration(symbol.valueDeclaration)
		? symbol.valueDeclaration
		: null;
}

export function getImportModuleName(imp: ts.ImportEqualsDeclaration | ts.ImportDeclaration | ts.ExportDeclaration): string | null {
	if (ts.isImportDeclaration(imp)) {
		return imp.importClause === undefined
			? null
			: (imp.moduleSpecifier as ts.StringLiteral).text
			;
	}

	if (ts.isExportDeclaration(imp)) {
		return imp.moduleSpecifier === undefined
			? null
			: (imp.moduleSpecifier as ts.StringLiteral).text
			;
	}

	if (ts.isExternalModuleReference(imp.moduleReference)) {
		if (!ts.isStringLiteral(imp.moduleReference.expression)) {
			warnLog(`Cannot handle non string-literal-like import expression: ${imp.moduleReference.expression.getText()}`);
			return null;
		}

		return imp.moduleReference.expression.text;
	}

	return null;
}

/**
 * Returns a symbol that an {@link importExportSpecifier} node references to.
 *
 * For example, for given `export { Value }` it returns a declaration of `Value` whatever it is (import statement, interface declaration, etc).
 */
export function getImportExportReferencedSymbol(importExportSpecifier: ts.ExportSpecifier | ts.ImportSpecifier, typeChecker: ts.TypeChecker): ts.Symbol {
	if (importExportSpecifier.propertyName !== undefined) {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return typeChecker.getSymbolAtLocation(importExportSpecifier.propertyName)!;
	} else {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const nameLocation = typeChecker.getSymbolAtLocation(importExportSpecifier.name)!;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const result = typeChecker.getImmediateAliasedSymbol(nameLocation)!;
		return result || nameLocation;
	}
}

export function getSymbolExportStarDeclarations(symbol: ts.Symbol): ts.ExportDeclaration[] {
	if (symbol.escapedName !== ts.InternalSymbolName.ExportStar) {
		throw new Error(`Only ExportStar symbol can have export star declaration, but got ${symbol.escapedName}`);
	}

	// this means that an export contains `export * from 'module'` statement
	return getDeclarationsForSymbol(symbol).filter((decl: ts.Declaration): decl is ts.ExportDeclaration => ts.isExportDeclaration(decl) && decl.moduleSpecifier !== undefined);
}

export function getDeclarationsForExportedValues(exp: ts.ExportAssignment | ts.ExportDeclaration, typeChecker: ts.TypeChecker): ts.Declaration[] {
	const nodeForSymbol = ts.isExportAssignment(exp) ? exp.expression : exp.moduleSpecifier;
	if (nodeForSymbol === undefined) {
		return [];
	}

	const symbolForExpression = typeChecker.getSymbolAtLocation(nodeForSymbol);
	if (symbolForExpression === undefined) {
		return [];
	}

	const symbol = getActualSymbol(symbolForExpression, typeChecker);
	return getDeclarationsForSymbol(symbol);
}

export function resolveGlobalName(typeChecker: ts.TypeChecker, name: string): ts.Symbol | undefined {
	interface Ts54CompatTypeChecker extends ts.TypeChecker {
		resolveName(name: string, location: ts.Node | undefined, meaning: ts.SymbolFlags, excludeGlobals: boolean): ts.Symbol | undefined;
	}

	// this value isn't available in all typescript versions so lets assign its value here instead
	const tsSymbolFlagsAll = /* ts.SymbolFlags.All */ -1 as ts.SymbolFlags;

	// see https://github.com/microsoft/TypeScript/pull/56932
	return (typeChecker as Ts54CompatTypeChecker).resolveName(name, undefined, tsSymbolFlagsAll, false);
}
