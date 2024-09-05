import * as ts from 'typescript';
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
} from './helpers/typescript';
import { warnLog } from './logger';

export class TypesUsageEvaluator {
	private readonly typeChecker: ts.TypeChecker;
	private readonly nodesParentsMap: Map<ts.Symbol, Set<ts.Symbol>> = new Map();

	private readonly usageResultCache: Map<ts.Symbol, Map<ts.Symbol, boolean>> = new Map();

	public constructor(files: ts.SourceFile[], typeChecker: ts.TypeChecker) {
		this.typeChecker = typeChecker;
		this.computeUsages(files);
	}

	public isSymbolUsedBySymbol(symbol: ts.Symbol, by: ts.Symbol): boolean {
		return this.isSymbolUsedBySymbolImpl(this.getActualSymbol(symbol), this.getActualSymbol(by), new Set<ts.Symbol>());
	}

	public getSymbolsUsingSymbol(symbol: ts.Symbol): Set<ts.Symbol> | null {
		return this.nodesParentsMap.get(this.getActualSymbol(symbol)) || null;
	}

	private isSymbolUsedBySymbolImpl(fromSymbol: ts.Symbol, toSymbol: ts.Symbol, visitedSymbols: Set<ts.Symbol>): boolean {
		if (fromSymbol === toSymbol) {
			return this.setUsageCacheValue(fromSymbol, toSymbol, true);
		}

		const cacheResult = this.usageResultCache.get(fromSymbol)?.get(toSymbol);
		if (cacheResult !== undefined) {
			return cacheResult;
		}

		const reachableNodes = this.nodesParentsMap.get(fromSymbol);
		if (reachableNodes !== undefined) {
			for (const symbol of reachableNodes) {
				if (visitedSymbols.has(symbol)) {
					continue;
				}

				visitedSymbols.add(symbol);
				if (this.isSymbolUsedBySymbolImpl(symbol, toSymbol, visitedSymbols)) {
					return this.setUsageCacheValue(fromSymbol, toSymbol, true);
				}
			}
		}

		visitedSymbols.add(fromSymbol);

		// note that we can't save negative result here because it might be not a final one
		// because we might ended up here because of `visitedSymbols.has(symbol)` check above
		// while actually checking that `symbol` symbol and we will store all its "children" as `false`
		// while in reality some of them might be `true` because of cross-references or using the same children symbols
		return false;
	}

	private setUsageCacheValue(fromSymbol: ts.Symbol, toSymbol: ts.Symbol, value: boolean): boolean {
		let fromSymbolCacheMap = this.usageResultCache.get(fromSymbol);
		if (fromSymbolCacheMap === undefined) {
			fromSymbolCacheMap = new Map();
			this.usageResultCache.set(fromSymbol, fromSymbolCacheMap);
		}

		fromSymbolCacheMap.set(toSymbol, value);

		return value;
	}

	private computeUsages(files: ts.SourceFile[]): void {
		this.nodesParentsMap.clear();

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
				try {
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
				} catch (error) {
					warnLog(`Could not resolve declaration. Are types installed for module: ${node.moduleSpecifier?.getText()}?`);
				}
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
			if (child.kind === ts.SyntaxKind.JSDoc) {
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
		});
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
