import * as ts from 'typescript';

import { compileDts } from './compile-dts';
import { TypesUsageEvaluator, isNodeDeclaration } from './types-usage-evaluator';
import { verboseLog, normalLog } from './logger';

export interface GenerationOptions {
	includes?: string[];
	outputFilenames?: boolean;
	failOnClass?: boolean;
}

const skippedNodes = [
	ts.SyntaxKind.ExportDeclaration,
	ts.SyntaxKind.ExportAssignment,
	ts.SyntaxKind.ImportDeclaration,
	ts.SyntaxKind.ImportEqualsDeclaration,
];

export function generateDtsBundle(filePath: string, options: GenerationOptions = {}): string {
	const includes = options.includes || [];

	if (!ts.sys.fileExists(filePath)) {
		throw new Error(`File "${filePath}" does not exist`);
	}

	const program = compileDts(filePath);
	const typeChecker = program.getTypeChecker();

	// we do not need any types from node_modules dir
	const sourceFiles = program.getSourceFiles().filter((file: ts.SourceFile) => {
		const isExternal = file.fileName.indexOf('node_modules') === -1;
		return isExternal || includes.some((includePart: string) => {
			return file.fileName.indexOf(includePart) !== -1;
		});
	});
	const typesUsageEvaluator = new TypesUsageEvaluator(sourceFiles, typeChecker);

	const rootSourceFileSymbol = typeChecker.getSymbolAtLocation(getRootSourceFile(program));
	const rootFileExports = typeChecker.getExportsOfModule(rootSourceFileSymbol).map((symbol: ts.Symbol) => {
		if (symbol.flags & ts.SymbolFlags.Alias) {
			// so we need to have original symbols from source file
			symbol = typeChecker.getAliasedSymbol(symbol);
		}

		return symbol;
	});

	let resultOutput = '';
	for (const sourceFile of sourceFiles) {
		verboseLog(`\n\n======= Preparing file: ${sourceFile.fileName} =======`);

		let fileOutput = '';
		for (const node of sourceFile.statements) {
			// we should skip import and exports statements
			if (skippedNodes.indexOf(node.kind) !== -1) {
				continue;
			}

			let isNodeUsed = false;
			if (isNodeDeclaration(node)) {
				isNodeUsed = rootFileExports.some(typesUsageEvaluator.isTypeUsedBySymbol.bind(typesUsageEvaluator, node));
			} else if (node.kind === ts.SyntaxKind.VariableStatement) {
				const declarations = (node as ts.VariableStatement).declarationList.declarations;
				isNodeUsed = declarations.some(isDeclarationExported.bind(null, rootFileExports, typeChecker));
			}

			if (!isNodeUsed) {
				verboseLog(`Skip file member: ${node.getText().replace(/(\n|\r)/g, '').slice(0, 50)}...`);
				continue;
			}

			let nodeText = node.getText();

			const hasNodeExportKeyword = hasNodeModifier(node, ts.SyntaxKind.ExportKeyword);

			if (node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.EnumDeclaration) {
				if (options.failOnClass === true && node.kind === ts.SyntaxKind.ClassDeclaration) {
					const classDecl = (node as ts.ClassDeclaration);
					const className = classDecl.name ? classDecl.name.text : '';
					const errorMessage = `Class was found in generated dts.\n ${className} from ${sourceFile.fileName}`;
					throw new Error(errorMessage);
				}

				// not all classes and enums can be exported - only exported from root file
				let shouldNodeHasExportKeyword = isDeclarationExported(rootFileExports, typeChecker, node as (ts.ClassDeclaration | ts.EnumDeclaration));
				if (node.kind === ts.SyntaxKind.EnumDeclaration) {
					// but const enum always can be exported
					shouldNodeHasExportKeyword = shouldNodeHasExportKeyword || hasNodeModifier(node, ts.SyntaxKind.ConstKeyword);
				}

				nodeText = getTextAccordingExport(nodeText, hasNodeExportKeyword, shouldNodeHasExportKeyword);
			} else {
				nodeText = getTextAccordingExport(nodeText, hasNodeExportKeyword, true);
			}

			fileOutput += `${nodeText}\n`;
		}

		if (fileOutput.length === 0) {
			normalLog(`No output for file: ${sourceFile.fileName}`);
		}

		if (options.outputFilenames) {
			fileOutput = `// File: ${sourceFile.fileName}\n\n${fileOutput}\n`;
		}

		resultOutput += fileOutput;
	}

	return resultOutput;
}

function getRootSourceFile(program: ts.Program): ts.SourceFile {
	const rootFiles = program.getRootFileNames();
	if (rootFiles.length !== 1) {
		verboseLog(`Root files:\n  ${rootFiles.join('\n  ')}`);
		throw new Error(`There is not one root file - ${rootFiles.length}`);
	}

	return program.getSourceFile(rootFiles[0]);
}

function isDeclarationExported(exportedSymbols: ts.Symbol[], typeChecker: ts.TypeChecker, declaration: ts.Declaration): boolean {
	if (!declaration.name) {
		return false;
	}

	const declarationSymbol = typeChecker.getSymbolAtLocation(declaration.name);
	return exportedSymbols.some((rootExport: ts.Symbol) => rootExport === declarationSymbol);
}

function getTextAccordingExport(nodeText: string, isNodeExported: boolean, shouldNodeBeExported: boolean): string {
	if (shouldNodeBeExported && !isNodeExported) {
		return 'export ' + nodeText;
	} else if (isNodeExported && !shouldNodeBeExported) {
		return nodeText.slice('export '.length);
	}

	return nodeText;
}

function hasNodeModifier(node: ts.Node, modifier: ts.SyntaxKind): boolean {
	return Boolean(node.modifiers && node.modifiers.some((nodeModifier: ts.Modifier) => nodeModifier.kind === modifier));
}
