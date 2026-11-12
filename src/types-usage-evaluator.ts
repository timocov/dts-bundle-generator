import ts from 'typescript';
import {
	getActualSymbol,
	getDeclarationsForExportedValues,
	getDeclarationsForSymbol,
	getImportExportReferencedSymbol,
	getNodeName,
	getNodeOwnSymbol,
	getSymbolExportStarDeclarations,
	isDeclareModule,
	isNodeNamedDeclaration,
	splitTransientSymbol,
} from './helpers/typescript.ts';
import { warnLog } from './logger.ts';

export interface TypesUsageEvaluatorOptions {
	/**
	 * If enabled, identifiers in `import()` types whose module cannot be resolved are skipped with a warning (and kept as is in the output).
	 * Otherwise generation fails.
	 */
	allowUnresolvedImportTypes?: boolean;
}

export class TypesUsageEvaluator {
	private readonly typeChecker: ts.TypeChecker;
	private readonly options: TypesUsageEvaluatorOptions;
	private readonly nodesParentsMap: Map<ts.Symbol, Set<ts.Symbol>> = new Map();

	private nodesChildrenMap: Map<ts.Symbol, Set<ts.Symbol>> | undefined;
	private readonly symbolsReachingCache: Map<ts.Symbol, Set<ts.Symbol>> = new Map();
	private readonly symbolPartsCache: Map<ts.Symbol, ts.Symbol[]> = new Map();

	public constructor(files: ts.SourceFile[], typeChecker: ts.TypeChecker, options: TypesUsageEvaluatorOptions = {}) {
		this.typeChecker = typeChecker;
		this.options = options;
		this.computeUsages(files);
	}

	public isSymbolUsedBySymbol(symbol: ts.Symbol, by: ts.Symbol): boolean {
		const symbols = this.getSymbolParts(symbol);
		return this.getSymbolParts(by).some((bySymbol: ts.Symbol) => {
			const reachingSymbols = this.getSymbolsReaching(bySymbol);
			return symbols.some((s: ts.Symbol) => reachingSymbols.has(s));
		});
	}

	public getSymbolsUsingSymbol(symbol: ts.Symbol): Set<ts.Symbol> | null {
		const usingSymbolsSets: Set<ts.Symbol>[] = [];
		for (const symbolPart of this.getSymbolParts(symbol)) {
			const usingSymbols = this.nodesParentsMap.get(symbolPart);
			if (usingSymbols !== undefined) {
				usingSymbolsSets.push(usingSymbols);
			}
		}

		if (usingSymbolsSets.length === 0) {
			return null;
		}

		return usingSymbolsSets.length === 1 ? usingSymbolsSets[0] : new Set(usingSymbolsSets.flatMap((set: Set<ts.Symbol>) => Array.from(set)));
	}

	/**
	 * The usages are stored for parts of a transient symbol (see {@link addUsages}), so we need to look them up in the same way.
	 * E.g. a named import of a member of `export =` module could be resolved to a transient symbol
	 * which combines a type from the module's namespace with a property of the exported value (see `combineValueAndTypeSymbols` in the TypeScript's checker).
	 */
	private getSymbolParts(symbol: ts.Symbol): ts.Symbol[] {
		// the result depends only on the symbol and the type checker, but it is requested many times for the same symbols
		// (e.g. once per every export in `isSymbolUsedBySymbol`) so it is worth to cache it
		let symbolParts = this.symbolPartsCache.get(symbol);
		if (symbolParts === undefined) {
			symbolParts = Array.from(splitTransientSymbol(this.getActualSymbol(symbol), this.typeChecker));
			this.symbolPartsCache.set(symbol, symbolParts);
		}

		return symbolParts;
	}

	// Returns every symbol from which `toSymbol` is reachable via `nodesParentsMap` edges (including `toSymbol` itself).
	// The usage graph is not mutated after construction, so one traversal per `toSymbol` answers all queries against it.
	private getSymbolsReaching(toSymbol: ts.Symbol): Set<ts.Symbol> {
		const cachedResult = this.symbolsReachingCache.get(toSymbol);
		if (cachedResult !== undefined) {
			return cachedResult;
		}

		const childrenMap = this.getNodesChildrenMap();
		const reachingSymbols = new Set<ts.Symbol>([toSymbol]);
		const symbolsToVisit: ts.Symbol[] = [toSymbol];

		for (let current = symbolsToVisit.pop(); current !== undefined; current = symbolsToVisit.pop()) {
			const children = childrenMap.get(current);
			if (children === undefined) {
				continue;
			}

			for (const child of children) {
				if (!reachingSymbols.has(child)) {
					reachingSymbols.add(child);
					symbolsToVisit.push(child);
				}
			}
		}

		this.symbolsReachingCache.set(toSymbol, reachingSymbols);
		return reachingSymbols;
	}

	private getNodesChildrenMap(): Map<ts.Symbol, Set<ts.Symbol>> {
		if (this.nodesChildrenMap === undefined) {
			const childrenMap = new Map<ts.Symbol, Set<ts.Symbol>>();
			for (const [childSymbol, parentSymbols] of this.nodesParentsMap) {
				for (const parentSymbol of parentSymbols) {
					let children = childrenMap.get(parentSymbol);
					if (children === undefined) {
						children = new Set<ts.Symbol>();
						childrenMap.set(parentSymbol, children);
					}

					children.add(childSymbol);
				}
			}

			this.nodesChildrenMap = childrenMap;
		}

		return this.nodesChildrenMap;
	}

	private computeUsages(files: ts.SourceFile[]): void {
		this.nodesParentsMap.clear();
		this.nodesChildrenMap = undefined;
		this.symbolsReachingCache.clear();
		this.symbolPartsCache.clear();

		for (const file of files) {
			ts.forEachChild(file, this.computeUsageForNode.bind(this));
		}
	}

	// eslint-disable-next-line complexity
	private computeUsageForNode(node: ts.Node): void {
		if (isDeclareModule(node) && node.body !== undefined && ts.isModuleBlock(node.body)) {
			const moduleSymbol = this.getSymbol(node.name);
			for (const statement of node.body.statements) {
				this.computeUsageForNode(statement);

				if (isNodeNamedDeclaration(statement)) {
					const nodeName = getNodeName(statement);
					if (nodeName !== undefined) {
						// a node declared in `declare module` should adds "usage" to that module
						// so we can track its usage later if needed
						const statementSymbol = this.getSymbol(nodeName);
						this.addUsages(statementSymbol, moduleSymbol);
					}
				}
			}
		}

		if (isNodeNamedDeclaration(node)) {
			const nodeName = getNodeName(node);
			if (nodeName !== undefined) {
				if (ts.isObjectBindingPattern(nodeName) || ts.isArrayBindingPattern(nodeName)) {
					for (const element of nodeName.elements) {
						this.computeUsageForNode(element);
					}
				} else {
					const childSymbol = this.getSymbol(nodeName);
					if (childSymbol !== null) {
						this.computeUsagesRecursively(node, childSymbol);
					}
				}
			}
		}

		if (ts.isVariableStatement(node)) {
			for (const varDeclaration of node.declarationList.declarations) {
				this.computeUsageForNode(varDeclaration);
			}
		}

		// `export * as ns from 'mod'`
		if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined && node.exportClause !== undefined && ts.isNamespaceExport(node.exportClause)) {
			this.addUsagesForNamespacedModule(node.exportClause, node.moduleSpecifier as ts.StringLiteral);
		}

		// `import * as ns from 'mod'`
		if (ts.isImportDeclaration(node) && node.moduleSpecifier !== undefined && node.importClause?.namedBindings !== undefined && ts.isNamespaceImport(node.importClause.namedBindings)) {
			// for namespaced imports we don't want to include module's exports into usage
			// because only exports actually "assign" all exports to a namespace node
			// namespaced imports affect only local scope (unless it is exported, but it handled elsewhere)
			this.addUsagesForNamespacedModule(node.importClause.namedBindings, node.moduleSpecifier as ts.StringLiteral, false);
		}

		// `export {}` or `export {} from 'mod'`
		if (ts.isExportDeclaration(node) && node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
			for (const exportElement of node.exportClause.elements) {
				const exportElementSymbol = getImportExportReferencedSymbol(exportElement, this.typeChecker);

				// i.e. `import * as NS from './local-module'`
				const namespaceImportForElement = getDeclarationsForSymbol(exportElementSymbol).find(ts.isNamespaceImport);
				if (namespaceImportForElement !== undefined) {
					// the namespaced import itself doesn't add a "usage", but re-export of that imported namespace does
					// so here we're handling the case where previously imported namespace import has been re-exported from a module
					this.addUsagesForNamespacedModule(namespaceImportForElement, namespaceImportForElement.parent.parent.moduleSpecifier as ts.StringLiteral);
				}

				// "link" referenced symbol with its import
				const exportElementOwnSymbol = this.getNodeOwnSymbol(exportElement.name);
				this.addUsages(exportElementSymbol, exportElementOwnSymbol);
				this.addUsages(this.getActualSymbol(exportElementSymbol), exportElementOwnSymbol);
			}
		}

		// `export =`
		if (ts.isExportAssignment(node) && node.isExportEquals) {
			this.addUsagesForExportAssignment(node);
		}
	}

	private addUsagesForExportAssignment(exportAssignment: ts.ExportAssignment): void {
		for (const declaration of getDeclarationsForExportedValues(exportAssignment, this.typeChecker)) {
			// `declare module foobar {}` or `namespace foobar {}`
			if (ts.isModuleDeclaration(declaration) && ts.isIdentifier(declaration.name) && declaration.body !== undefined && ts.isModuleBlock(declaration.body)) {
				const moduleSymbol = this.getSymbol(declaration.name);

				for (const statement of declaration.body.statements) {
					if (isNodeNamedDeclaration(statement) && statement.name !== undefined) {
						const statementSymbol = this.getSymbol(statement.name);
						if (statementSymbol !== null) {
							// this feels counter-intuitive that we assign a statement as a parent of a module
							// but this is what happens when you have `export=` statements
							// you can import an interface declared in `export=` exported namespace
							// via named import statement
							// e.g. lets say you have `namespace foo { export interface Interface {} }; export = foo;`
							// then you can import it like `import { Interface } from 'module'`
							// in this case only `Interface` is used, but it is part of module `foo`
							// which means that `foo` is used via using `Interface`
							// if you're reading this - please stop using `export=` exports asap!
							this.addUsages(moduleSymbol, statementSymbol);
						}
					}
				}
			}
		}
	}

	private addUsagesForNamespacedModule(namespaceNode: ts.NamespaceImport | ts.NamespaceExport, moduleSpecifier: ts.StringLiteral, includeExports: boolean = true): void {
		// note that we shouldn't resolve the actual symbol for the namespace
		// as in some circumstances it will be resolved to the source file
		// i.e. namespaceSymbol would become referencedModuleSymbol so it would be no-op
		// but we want to add this module's usage to the map
		const namespaceSymbol = this.getNodeOwnSymbol(namespaceNode.name);
		const referencedSourceFileSymbol = this.getSymbol(moduleSpecifier);
		this.addUsages(referencedSourceFileSymbol, namespaceSymbol);

		// but in case it is not resolved to the source file we need to link them
		const resolvedNamespaceSymbol = this.getSymbol(namespaceNode.name);
		this.addUsages(resolvedNamespaceSymbol, namespaceSymbol);

		if (includeExports) {
			// if a referenced source file has any exports, they should be added "to the usage" as they all are re-exported/imported
			this.addExportsToSymbol(referencedSourceFileSymbol.exports, referencedSourceFileSymbol);
		}
	}

	private addExportsToSymbol(exports: ts.SymbolTable | undefined, parentSymbol: ts.Symbol, visitedSymbols: Set<ts.Symbol> = new Set()): void {
		exports?.forEach((moduleExportedSymbol: ts.Symbol, name: ts.__String) => {
			if (name === ts.InternalSymbolName.ExportStar) {
				// this means that an export contains `export * from 'module'` statement
				for (const exportStarDeclaration of getSymbolExportStarDeclarations(moduleExportedSymbol)) {
					if (exportStarDeclaration.moduleSpecifier === undefined) {
						throw new Error(`Export star declaration does not have a module specifier '${exportStarDeclaration.getText()}'`);
					}

					const referencedSourceFileSymbol = this.getSymbol(exportStarDeclaration.moduleSpecifier);
					if (visitedSymbols.has(referencedSourceFileSymbol)) {
						continue;
					}

					visitedSymbols.add(referencedSourceFileSymbol);

					this.addExportsToSymbol(referencedSourceFileSymbol.exports, parentSymbol, visitedSymbols);
				}

				return;
			}

			this.addUsages(moduleExportedSymbol, parentSymbol);
		});
	}

	private computeUsagesRecursively(parent: ts.Node, parentSymbol: ts.Symbol): void {
		ts.forEachChild(parent, (child: ts.Node) => {
			this.computeUsagesForChild(child, parentSymbol);
		});
	}

	private computeUsagesForChild(child: ts.Node, parentSymbol: ts.Symbol): void {
		if (child.kind === ts.SyntaxKind.JSDoc) {
			return;
		}

		if (ts.isImportTypeNode(child) && this.isUnresolvedImportType(child)) {
			// the qualifier has no symbols to track, but type arguments (if any) might reference other symbols
			// note that type arguments must be handled as children (not via `computeUsagesRecursively`)
			// because they might be unresolved import types themselves, e.g. `import('a').A<import('b').B>`
			child.typeArguments?.forEach((typeArgument: ts.TypeNode) => {
				this.computeUsagesForChild(typeArgument, parentSymbol);
			});

			return;
		}

		this.computeUsagesRecursively(child, parentSymbol);

		if (ts.isIdentifier(child) || child.kind === ts.SyntaxKind.DefaultKeyword) {
			// identifiers in labelled tuples don't have symbols for their labels
			// so let's just skip them from collecting
			if (ts.isNamedTupleMember(child.parent) && child.parent.name === child) {
				return;
			}

			// `{ propertyName: name }` - in this case we don't need to handle `propertyName` as it has no symbol
			if (ts.isBindingElement(child.parent) && child.parent.propertyName === child) {
				return;
			}

			this.addUsages(this.getSymbol(child), parentSymbol);

			if (!ts.isQualifiedName(child.parent)) {
				const childOwnSymbol = this.getNodeOwnSymbol(child);

				// i.e. `import * as NS from './local-module'`
				const namespaceImport = getDeclarationsForSymbol(childOwnSymbol).find(ts.isNamespaceImport);
				if (namespaceImport !== undefined) {
					// if a node is an identifier and not part of a qualified name
					// and it was created as part of namespaced import
					// then we need to assign all exports of referenced module into that namespace
					// because they might not be added previously while processing imports/exports
					this.addUsagesForNamespacedModule(namespaceImport, namespaceImport.parent.parent.moduleSpecifier as ts.StringLiteral, true);
				}
			}
		}
	}

	/**
	 * Checks whether an `import()` type with a qualifier (e.g. `import('module').A.B`) refers to a module that cannot be resolved.
	 * Some libraries intentionally probe for optional modules in their declarations (usually with `// @ts-ignore`),
	 * so such types are treated as "given" (i.e. kept as is) if it is allowed by the options, otherwise it throws.
	 *
	 * @returns `true` if the import type is unresolved (and allowed), so it should be skipped
	 */
	private isUnresolvedImportType(importType: ts.ImportTypeNode): boolean {
		// without a qualifier there is nothing to track (and nothing could fail), e.g. `typeof import('module')`
		if (importType.qualifier === undefined || !ts.isLiteralTypeNode(importType.argument) || !ts.isStringLiteral(importType.argument.literal)) {
			return false;
		}

		if (this.typeChecker.getSymbolAtLocation(importType.argument.literal) !== undefined) {
			// the module is resolved, so any further failure is not about an unresolved module
			return false;
		}

		const moduleName = importType.argument.literal.text;
		const location = `"${importType.getText()}" from "${importType.getSourceFile().fileName}"`;
		if (!this.options.allowUnresolvedImportTypes) {
			throw new Error(`Cannot resolve module "${moduleName}" in the import type ${location}.
If this is expected (e.g. a library checks for optional modules in its typings), enable the "--allow-unresolved-import-types" option ('compilationOptions.allowUnresolvedImportTypes' in the config) to keep such types as they are.`);
		}

		warnLog(`Skipping the import type ${location}: cannot resolve module "${moduleName}". The type is kept as is.`);
		return true;
	}

	private addUsages(childSymbol: ts.Symbol, parentSymbol: ts.Symbol): void {
		const childSymbols = splitTransientSymbol(childSymbol, this.typeChecker);

		for (const childSplitSymbol of childSymbols) {
			let symbols = this.nodesParentsMap.get(childSplitSymbol);
			if (symbols === undefined) {
				symbols = new Set<ts.Symbol>();
				this.nodesParentsMap.set(childSplitSymbol, symbols);
			}

			// to avoid infinite recursion
			if (childSplitSymbol !== parentSymbol) {
				symbols.add(parentSymbol);
			}
		}
	}

	private getSymbol(node: ts.Node): ts.Symbol {
		return this.getActualSymbol(this.getNodeOwnSymbol(node));
	}

	private getNodeOwnSymbol(node: ts.Node): ts.Symbol {
		return getNodeOwnSymbol(node, this.typeChecker);
	}

	private getActualSymbol(symbol: ts.Symbol): ts.Symbol {
		return getActualSymbol(symbol, this.typeChecker);
	}
}
