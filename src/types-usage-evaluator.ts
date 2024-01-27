import * as ts from 'typescript';
import {
	getActualSymbol,
	getDeclarationsForExportedValues,
	getDeclarationsForSymbol,
	getExportReferencedSymbol,
	getNodeName,
	getNodeOwnSymbol,
	getSymbolExportStarDeclarations,
	isDeclareModule,
	isNodeNamedDeclaration,
	splitTransientSymbol,
} from './helpers/typescript';

export class TypesUsageEvaluator {
	private readonly typeChecker: ts.TypeChecker;
	private readonly nodesParentsMap: Map<ts.Symbol, Set<ts.Symbol>> = new Map();

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
			return true;
		}

		const reachableNodes = this.nodesParentsMap.get(fromSymbol);
		if (reachableNodes !== undefined) {
			for (const symbol of reachableNodes) {
				if (visitedSymbols.has(symbol)) {
					continue;
				}

				visitedSymbols.add(symbol);
				if (this.isSymbolUsedBySymbolImpl(symbol, toSymbol, visitedSymbols)) {
					return true;
				}
			}
		}

		visitedSymbols.add(fromSymbol);

		return false;
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
			for (const statement of node.body.statements) {
				this.computeUsageForNode(statement);
			}
		}

		if (isNodeNamedDeclaration(node)) {
			const nodeName = getNodeName(node);
			if (nodeName !== undefined) {
				const childSymbol = this.getSymbol(nodeName);
				if (childSymbol !== null) {
					this.computeUsagesRecursively(node, childSymbol);
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

		// `export {}` or `export {} from 'mod'`
		if (ts.isExportDeclaration(node) && node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
			for (const exportElement of node.exportClause.elements) {
				const exportElementSymbol = getExportReferencedSymbol(exportElement, this.typeChecker);

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

	private addUsagesForNamespacedModule(namespaceNode: ts.NamespaceImport | ts.NamespaceExport, moduleSpecifier: ts.StringLiteral): void {
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

		// if a referenced source file has any exports, they should be added "to the usage" as they all are re-exported/imported
		this.addExportsToSymbol(referencedSourceFileSymbol.exports, referencedSourceFileSymbol);
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
		const queue = parent.getChildren();
		for (const child of queue) {
			if (child.kind === ts.SyntaxKind.JSDoc) {
				continue;
			}

			queue.push(...child.getChildren());

			if (ts.isIdentifier(child) || child.kind === ts.SyntaxKind.DefaultKeyword) {
				// identifiers in labelled tuples don't have symbols for their labels
				// so let's just skip them from collecting
				if (ts.isNamedTupleMember(child.parent) && child.parent.name === child) {
					continue;
				}

				// `{ propertyName: name }` - in this case we don't need to handle `propertyName` as it has no symbol
				if (ts.isBindingElement(child.parent) && child.parent.propertyName === child) {
					continue;
				}

				this.addUsages(this.getSymbol(child), parentSymbol);
			}
		}
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
