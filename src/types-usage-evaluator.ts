import * as ts from 'typescript';
import {
	getActualSymbol,
	isDeclareModule,
	isNamedTupleMember,
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

	private computeUsageForNode(node: ts.Node): void {
		if (isDeclareModule(node) && node.body !== undefined && ts.isModuleBlock(node.body)) {
			for (const statement of node.body.statements) {
				this.computeUsageForNode(statement);
			}
		} else if (isNodeNamedDeclaration(node) && node.name) {
			const childSymbol = this.getSymbol(node.name);
			this.computeUsagesRecursively(node, childSymbol);
		} else if (ts.isVariableStatement(node)) {
			for (const varDeclaration of node.declarationList.declarations) {
				this.computeUsageForNode(varDeclaration);
			}
		}
	}

	private computeUsagesRecursively(parent: ts.Node, parentSymbol: ts.Symbol): void {
		const queue = parent.getChildren();
		for (const child of queue) {
			if (child.kind === ts.SyntaxKind.JSDocComment) {
				continue;
			}

			queue.push(...child.getChildren());

			if (ts.isIdentifier(child)) {
				// identifiers in labelled tuples don't have symbols for their labels
				// so let's just skip them from collecting
				// since this feature is for TypeScript > 4, we have to check that a function exist before accessing it
				if (isNamedTupleMember(child.parent) && child.parent.name === child) {
					continue;
				}

				const childSymbols = splitTransientSymbol(this.getSymbol(child), this.typeChecker);

				for (const childSymbol of childSymbols) {
					let symbols = this.nodesParentsMap.get(childSymbol);
					if (symbols === undefined) {
						symbols = new Set<ts.Symbol>();
						this.nodesParentsMap.set(childSymbol, symbols);
					}

					// to avoid infinite recursion
					if (childSymbol !== parentSymbol) {
						symbols.add(parentSymbol);
					}
				}
			}
		}
	}

	private getSymbol(node: ts.Node): ts.Symbol {
		const nodeSymbol = this.typeChecker.getSymbolAtLocation(node);
		if (nodeSymbol === undefined) {
			throw new Error(`Cannot find symbol for node: ${node.getText()}`);
		}

		return this.getActualSymbol(nodeSymbol);
	}

	private getActualSymbol(symbol: ts.Symbol): ts.Symbol {
		return getActualSymbol(symbol, this.typeChecker);
	}
}
