import * as ts from 'typescript';

export type NodesParents = Map<ts.Symbol, Set<ts.Symbol>>;

const declarationKinds = [
	ts.SyntaxKind.InterfaceDeclaration,
	ts.SyntaxKind.ClassDeclaration,
	ts.SyntaxKind.EnumDeclaration,
	ts.SyntaxKind.TypeAliasDeclaration,
	ts.SyntaxKind.ModuleDeclaration,
	ts.SyntaxKind.FunctionDeclaration,
	ts.SyntaxKind.VariableDeclaration,
];

export function isNodeDeclaration(node: ts.Node): node is ts.Declaration {
	return declarationKinds.indexOf(node.kind) !== -1;
}

export class TypesUsageEvaluator {
	private typeChecker: ts.TypeChecker;
	private nodesParentsMap: NodesParents = new Map<ts.Symbol, Set<ts.Symbol>>();

	public constructor(files: ts.SourceFile[], typeChecker: ts.TypeChecker) {
		this.typeChecker = typeChecker;
		this.computeUsages(files);
	}

	public isTypeUsedBySymbol(typeNode: ts.Declaration, by: ts.Symbol): boolean {
		if (!typeNode.name) {
			// anon?
			return false;
		}

		return this.isSymbolUsedBySymbol(this.getSymbol(typeNode.name), this.getActualSymbol(by), new Set<ts.Symbol>());
	}

	private isSymbolUsedBySymbol(fromSymbol: ts.Symbol, toSymbol: ts.Symbol, visitedSymbols: Set<ts.Symbol>): boolean {
		if (fromSymbol === toSymbol) {
			return true;
		}

		const reachableNodes = this.nodesParentsMap.get(fromSymbol);
		if (reachableNodes) {
			for (const symbol of Array.from(reachableNodes)) {
				if (visitedSymbols.has(symbol)) {
					continue;
				}

				visitedSymbols.add(symbol);
				if (this.isSymbolUsedBySymbol(symbol, toSymbol, visitedSymbols)) {
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
		if (isNodeDeclaration(node) && node.name) {
			const childSymbol = this.getSymbol(node.name);
			this.computeUsagesRecursively(node, childSymbol);
		} else if (node.kind === ts.SyntaxKind.VariableStatement) {
			for (const varDeclaration of (node as ts.VariableStatement).declarationList.declarations) {
				this.computeUsageForNode(varDeclaration);
			}
		}
	}

	private computeUsagesRecursively(parent: ts.Node, parentSymbol: ts.Symbol): void {
		const queue = parent.getChildren();
		for (let i = 0; i < queue.length; ++i) {
			const child = queue[i];
			if (child.kind === ts.SyntaxKind.JSDocComment) {
				continue;
			}

			queue.push(...child.getChildren());

			if (child.kind === ts.SyntaxKind.Identifier) {
				const childSymbol = this.getSymbol(child);

				let symbols = this.nodesParentsMap.get(childSymbol);
				if (!symbols) {
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

	private getSymbol(node: ts.Node): ts.Symbol {
		return this.getActualSymbol(this.typeChecker.getSymbolAtLocation(node));
	}

	private getActualSymbol(symbol: ts.Symbol): ts.Symbol {
		if (symbol.flags & ts.SymbolFlags.Alias) {
			return this.getActualSymbol(this.typeChecker.getAliasedSymbol(symbol));
		}

		return symbol;
	}
}
