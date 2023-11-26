import * as ts from 'typescript';
import {
	getActualSymbol,
	isDeclareModule,
	isNodeNamedDeclaration,
	splitTransientSymbol,
} from './helpers/typescript';

export type NodesParents = Map<ts.Symbol, Set<ts.Symbol>>;

export class TypesUsageEvaluator {
	private readonly typeChecker: ts.TypeChecker;
	private readonly nodesParentsMap: NodesParents = new Map<ts.Symbol, Set<ts.Symbol>>();

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
			for (const symbol of Array.from(reachableNodes)) {
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

		if (isNodeNamedDeclaration(node) && node.name) {
			const childSymbol = this.getSymbol(node.name);
			this.computeUsagesRecursively(node, childSymbol);
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
		if (ts.isImportDeclaration(node) && node.moduleSpecifier !== undefined && node.importClause !== undefined && node.importClause.namedBindings !== undefined && ts.isNamespaceImport(node.importClause.namedBindings)) {
			this.addUsagesForNamespacedModule(node.importClause.namedBindings, node.moduleSpecifier as ts.StringLiteral);
		}
	}

	private addUsagesForNamespacedModule(namespaceNode: ts.NamespaceImport | ts.NamespaceExport, moduleSpecifier: ts.StringLiteral): void {
		const namespaceSymbol = this.getSymbol(namespaceNode.name);
		const referencedSourceFileSymbol = this.getSymbol(moduleSpecifier);
		this.addUsages(referencedSourceFileSymbol, namespaceSymbol);
	}

	private computeUsagesRecursively(parent: ts.Node, parentSymbol: ts.Symbol): void {
		const queue = parent.getChildren();
		for (const child of queue) {
			if (child.kind === ts.SyntaxKind.JSDoc) {
				continue;
			}

			queue.push(...child.getChildren());

			if (ts.isIdentifier(child)) {
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
		const nodeSymbol = this.typeChecker.getSymbolAtLocation(node);
		if (nodeSymbol === undefined) {
			throw new Error(`Cannot find symbol for node "${node.getText()}" in "${node.parent.getText()}" from "${node.getSourceFile().fileName}"`);
		}

		return nodeSymbol;
	}

	private getActualSymbol(symbol: ts.Symbol): ts.Symbol {
		return getActualSymbol(symbol, this.typeChecker);
	}
}
