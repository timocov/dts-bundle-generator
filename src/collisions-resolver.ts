import * as ts from 'typescript';

import {
	getActualSymbol,
	getDeclarationNameSymbol,
} from './helpers/typescript';
import { verboseLog } from './logger';

const renamingSupportedSymbols: readonly ts.SymbolFlags[] = [
	ts.SymbolFlags.Alias,
	ts.SymbolFlags.BlockScopedVariable,
	ts.SymbolFlags.Class,
	ts.SymbolFlags.Enum,
	ts.SymbolFlags.Function,
	ts.SymbolFlags.Interface,
	ts.SymbolFlags.NamespaceModule,
	ts.SymbolFlags.TypeAlias,
	ts.SymbolFlags.ValueModule,
];

export interface ResolverIdentifier {
	name: string;
	identifier?: ts.Identifier;
}

/**
 * A class that holds information about top-level scoped names and allows to get collision-free names in one occurred.
 */
export class CollisionsResolver {
	private typeChecker: ts.TypeChecker;

	private collisionsMap: Map<string, ts.Symbol[]> = new Map();
	private generatedNames: Map<ts.Symbol, Set<string>> = new Map();

	public constructor(typeChecker: ts.TypeChecker) {
		this.typeChecker = typeChecker;
	}

	/**
	 * Adds (or "registers") a top-level {@link identifier} (which takes a top-level scope name to use).
	 */
	public addTopLevelIdentifier(identifier: ts.Identifier | ts.DefaultKeyword): string {
		const symbol = getDeclarationNameSymbol(identifier, this.typeChecker);
		if (symbol === null) {
			throw new Error(`Something went wrong - cannot find a symbol for top-level identifier ${identifier.getText()} (from ${identifier.parent.parent.getText()})`);
		}

		const newLocalName = this.registerSymbol(symbol, identifier.getText());
		if (newLocalName === null) {
			throw new Error(`Something went wrong - a symbol ${symbol.name} for top-level identifier ${identifier.getText()} cannot be renamed`);
		}

		return newLocalName;
	}

	/**
	 * Returns a set of all already registered names for a given {@link symbol}.
	 */
	public namesForSymbol(symbol: ts.Symbol): Set<string> {
		return this.generatedNames.get(getActualSymbol(symbol, this.typeChecker)) || new Set();
	}

	/**
	 * Resolves given {@link referencedIdentifier} to a name.
	 * It assumes that a symbol for this identifier has been registered before by calling {@link addTopLevelIdentifier} method.
	 * Otherwise it will return `null`.
	 */
	public resolveReferencedIdentifier(referencedIdentifier: ts.Identifier): string | null {
		const identifierSymbol = getDeclarationNameSymbol(referencedIdentifier, this.typeChecker);
		if (identifierSymbol === null) {
			// that's fine if an identifier doesn't have a symbol
			// it could be in cases like for `prop` in `declare function func({ prop: prop3 }?: InterfaceName): TypeName;`
			return null;
		}

		const namesForSymbol = this.namesForSymbol(identifierSymbol);
		const identifierText = referencedIdentifier.getText();
		if (namesForSymbol.has(identifierText)) {
			// if the set of already registered names contains the one that is requested then lets use it
			return identifierText;
		}

		return Array.from(namesForSymbol)[0] || null;
	}

	/**
	 * Similar to {@link resolveReferencedIdentifier}, but works with qualified names (Ns.Ns1.Interface).
	 * The main point of this resolver is that it might change the first part of the qualifier only (as it drives uniqueness of a name).
	 */
	public resolveReferencedQualifiedName(referencedIdentifier: ts.QualifiedName | ts.PropertyAccessEntityNameExpression): string | null {
		let topLevelIdentifier: ts.Identifier | ts.QualifiedName | ts.PropertyAccessEntityNameExpression = referencedIdentifier;

		if (ts.isQualifiedName(topLevelIdentifier) || ts.isPropertyAccessExpression(topLevelIdentifier)) {
			let leftmostIdentifier = ts.isQualifiedName(topLevelIdentifier) ? topLevelIdentifier.left : topLevelIdentifier.expression;

			while (ts.isQualifiedName(leftmostIdentifier) || ts.isPropertyAccessExpression(leftmostIdentifier)) {
				leftmostIdentifier = ts.isQualifiedName(leftmostIdentifier) ? leftmostIdentifier.left : leftmostIdentifier.expression;
			}

			topLevelIdentifier = leftmostIdentifier;
		}

		const topLevelName = this.resolveReferencedIdentifier(topLevelIdentifier);
		if (topLevelName === null) {
			// that's fine if we don't have a name for this top-level symbol
			// it simply means that this symbol type might not be supported for renaming
			// at this point the top-level identifier isn't registered yet
			// but it is possible that the full qualified name is registered so we can use its replacement instead
			// it is possible in cases where you use `import * as nsName` for internal modules
			// so `nsName.Interface` will be resolved to `Interface` (or any other name that `Interface` was registered with)
			const identifierSymbol = getDeclarationNameSymbol(referencedIdentifier, this.typeChecker);
			if (identifierSymbol === null) {
				// that's fine if an identifier doesn't have a symbol
				// it could be in cases like for `prop` in `declare function func({ prop: prop3 }?: InterfaceName): TypeName;`
				return null;
			}

			const namesForSymbol = this.namesForSymbol(identifierSymbol);
			if (namesForSymbol.size !== 0) {
				// if the set of already registered names contains the one that is requested then lets use it
				return Array.from(namesForSymbol)[0];
			}

			// if it is not registered - just skip it
			return null;
		}

		// for nodes that we have to import we need to add an imported value to the collisions map
		// so it will not overlap with other imports/inlined nodes
		const identifierParts = referencedIdentifier.getText().split('.');

		// update top level part as it could get renamed above
		identifierParts[0] = topLevelName;

		return identifierParts.join('.');
	}

	private registerSymbol(identifierSymbol: ts.Symbol, preferredName: string): string | null {
		if (!renamingSupportedSymbols.some((flag: ts.SymbolFlags) => identifierSymbol.flags & flag)) {
			// if a symbol for something else that we don't support yet - skip
			verboseLog(`Symbol ${identifierSymbol.name} cannot be renamed because its flag (${identifierSymbol.flags}) isn't supported`);
			return null;
		}

		if (identifierSymbol.flags & ts.SymbolFlags.NamespaceModule && identifierSymbol.escapedName === ts.InternalSymbolName.Global) {
			// no need to rename `declare global` namespaces
			return null;
		}

		let symbolName = preferredName;
		if (symbolName === 'default') {
			// this is special case as an identifier cannot be named `default` because of es6 syntax
			// so lets fallback to some valid name
			symbolName = '_default';
		}

		const collisionsKey = symbolName;
		let nameSymbols = this.collisionsMap.get(collisionsKey);
		if (nameSymbols === undefined) {
			nameSymbols = [identifierSymbol];
			this.collisionsMap.set(collisionsKey, nameSymbols);
		}

		let symbolIndex = nameSymbols.indexOf(identifierSymbol);
		if (symbolIndex === -1) {
			nameSymbols.push(identifierSymbol);
			symbolIndex = nameSymbols.length - 1;
		}

		const newName = symbolIndex === 0 ? symbolName : `${symbolName}$${symbolIndex}`;

		let symbolNames = this.generatedNames.get(identifierSymbol);
		if (symbolNames === undefined) {
			symbolNames = new Set();
			this.generatedNames.set(identifierSymbol, symbolNames);
		}

		symbolNames.add(newName);

		return newName;
	}
}
