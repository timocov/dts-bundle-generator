import * as ts from 'typescript';

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

// actually we should use ts.DefaultKeyword instead of ts.Modifier
// but there is no such type in previous versions of the compiler so we cannot use it here
// TODO: replace with ts.DefaultKeyword once the min typescript will be upgraded
export type NodeName = ts.DeclarationName | ts.Modifier;

export function isNodeNamedDeclaration(node: ts.Node): node is ts.NamedDeclaration {
	return namedDeclarationKinds.indexOf(node.kind) !== -1;
}

export function hasNodeModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
	return Boolean(node.modifiers && node.modifiers.some((nodeModifier: NonNullable<ts.Node['modifiers']>[number]) => nodeModifier.kind === modifier));
}

export function getNodeName(node: ts.Node): NodeName | undefined {
	const nodeName = (node as unknown as ts.NamedDeclaration).name;
	if (nodeName === undefined) {
		const defaultModifier = node.modifiers?.find((mod: NonNullable<ts.Node['modifiers']>[number]) => mod.kind === ts.SyntaxKind.DefaultKeyword);
		if (defaultModifier !== undefined) {
			return defaultModifier as NodeName;
		}
	}

	return nodeName;
}

export function getActualSymbol(symbol: ts.Symbol, typeChecker: ts.TypeChecker): ts.Symbol {
	if (symbol.flags & ts.SymbolFlags.Alias) {
		symbol = typeChecker.getAliasedSymbol(symbol);
	}

	return symbol;
}

export function getDeclarationNameSymbol(name: NodeName, typeChecker: ts.TypeChecker): ts.Symbol | null {
	const symbol = typeChecker.getSymbolAtLocation(name);
	if (symbol === undefined) {
		return null;
	}

	return getActualSymbol(symbol, typeChecker);
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

		const sym = typeChecker.getSymbolAtLocation(declaration.name);
		if (sym === undefined) {
			continue;
		}

		result.push(getActualSymbol(sym, typeChecker));
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

export const enum ExportType {
	CommonJS,
	ES6Named,
	ES6Default,
}

export interface SourceFileExport {
	originalName: string;
	exportedName: string;
	symbol: ts.Symbol;
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
					type: ExportType.CommonJS,
					exportedName: '',
					originalName: symbol.escapedName as string,
				},
			];
		}
	}

	const result: SourceFileExport[] = typeChecker
		.getExportsOfModule(sourceFileSymbol)
		.map((symbol: ts.Symbol) => ({ symbol, exportedName: symbol.escapedName as string, type: ExportType.ES6Named, originalName: '' }));

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
					originalName: '',
				});
			}
		}
	}

	result.forEach((exp: SourceFileExport) => {
		exp.symbol = getActualSymbol(exp.symbol, typeChecker);

		const resolvedIdentifier = resolveIdentifierBySymbol(exp.symbol);
		exp.originalName = resolvedIdentifier !== undefined ? resolvedIdentifier.getText() : exp.symbol.escapedName as string;
	});

	return result;
}

export function resolveIdentifier(typeChecker: ts.TypeChecker, identifier: ts.Identifier): ts.NamedDeclaration['name'] {
	const symbol = getDeclarationNameSymbol(identifier, typeChecker);
	if (symbol === null) {
		return undefined;
	}

	return resolveIdentifierBySymbol(symbol);
}

function resolveIdentifierBySymbol(identifierSymbol: ts.Symbol): ts.NamedDeclaration['name'] {
	const declarations = getDeclarationsForSymbol(identifierSymbol);
	if (declarations.length === 0) {
		return undefined;
	}

	const decl = declarations[0];
	if (!isNodeNamedDeclaration(decl)) {
		return undefined;
	}

	return decl.name;
}

export function getExportsForStatement(
	exportedSymbols: readonly SourceFileExport[],
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

// labelled tuples were introduced in TypeScript 4.0, prior 4.0 version type `ts.NamedTupleMember` didn't exist
// so the main question is how to make the compiler happy to compile the code without errors
// and at the same time don't use `any` type and provide proper autocomplete and properties checking _with previous versions of the compiler_?
// the following trick allows us to handle this!
// if ts.NamedTupleMember doesn't exist (< 4.0) - NamedTupleMember will be `any` type
// otherwise it will be a proper type from the compiler's typings
// (this is how @ts-ignore works)
// thus this type must NOT be inlined
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
type NamedTupleMember = ts.NamedTupleMember;

// if NamedTupleMember is `any` type then let's use a fallback (we don't need to provide full type spec here, just what we're using in the code)
// otherwise we'll use its type so we don't need to use a fallback
type NamedTupleMemberCompat = unknown extends NamedTupleMember ? ts.Node & { name: ts.Identifier } : NamedTupleMember;

export function isNamedTupleMember(node: ts.Node): node is NamedTupleMemberCompat {
	interface CompatibilityTypeScriptPart {
		// labelled tuples and this method were introduced in TypeScript 4.0
		// so, to be compiled with TypeScript < 4.0 we need to have this trick
		isNamedTupleMember?(node: ts.Node): node is NamedTupleMemberCompat;
	}

	type CommonKeys = keyof (CompatibilityTypeScriptPart | typeof ts);

	// if current ts.Program has isNamedTupleMember method - then use it
	// if it does not have it yet - use fallback
	type CompatibleTypeScript = CommonKeys extends never ? typeof ts & CompatibilityTypeScriptPart : typeof ts;

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const compatTs = ts as CompatibleTypeScript;
	if (!compatTs.isNamedTupleMember) {
		return false;
	}

	return compatTs.isNamedTupleMember(node);
}
