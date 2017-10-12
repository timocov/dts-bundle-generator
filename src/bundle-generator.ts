import * as ts from 'typescript';

import { compileDts } from './compile-dts';
import { TypesUsageEvaluator, isNodeDeclaration } from './types-usage-evaluator';
import { verboseLog, normalLog } from './logger';

export interface GenerationOptions {
	outputFilenames?: boolean;
	failOnClass?: boolean;
	inlinedLibraries?: string[];
	importedLibraries?: string[];
}

const skippedNodes = [
	ts.SyntaxKind.ExportDeclaration,
	ts.SyntaxKind.ExportAssignment,
	ts.SyntaxKind.ImportDeclaration,
	ts.SyntaxKind.ImportEqualsDeclaration,
];

// tslint:disable-next-line:cyclomatic-complexity
export function generateDtsBundle(filePath: string, options: GenerationOptions = {}): string {
	const inlinedLibraries = options.inlinedLibraries || [];
	const importedLibraries = options.importedLibraries || [];

	if (!ts.sys.fileExists(filePath)) {
		throw new Error(`File "${filePath}" does not exist`);
	}

	const program = compileDts(filePath);
	const typeChecker = program.getTypeChecker();

	// we do not need all files from node_modules dir - only inlined and imported
	const sourceFiles = program.getSourceFiles().filter((file: ts.SourceFile) => {
		const isExternal = file.fileName.indexOf('node_modules') !== -1;
		return !isExternal
			|| getLibraryName(inlinedLibraries, file.fileName) !== null
			|| getLibraryName(importedLibraries, file.fileName) !== null;
	});

	verboseLog(`Input source files:\n  ${sourceFiles.map((file: ts.SourceFile) => file.fileName).join('\n  ')}`);

	const typesUsageEvaluator = new TypesUsageEvaluator(sourceFiles, typeChecker);

	const rootSourceFileSymbol = typeChecker.getSymbolAtLocation(getRootSourceFile(program));
	if (rootSourceFileSymbol === undefined) {
		throw new Error('Symbol for root source file not found');
	}

	const rootFileExports = typeChecker.getExportsOfModule(rootSourceFileSymbol).map((symbol: ts.Symbol) => {
		if (symbol.flags & ts.SymbolFlags.Alias) {
			// so we need to have original symbols from source file
			symbol = typeChecker.getAliasedSymbol(symbol);
		}

		return symbol;
	});

	const importedSymbols = new Map<string, Set<string>>();

	let resultOutput = '';
	for (const sourceFile of sourceFiles) {
		verboseLog(`\n\n======= Preparing file: ${sourceFile.fileName} =======`);

		const sourceFileText = sourceFile.getFullText();

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
				isNodeUsed = declarations.some((declaration: ts.VariableDeclaration) => {
					return isDeclarationExported(rootFileExports, typeChecker, declaration);
				});
			}

			if (!isNodeUsed) {
				verboseLog(`Skip file member: ${node.getText().replace(/(\n|\r)/g, '').slice(0, 50)}...`);
				continue;
			}

			const importedLibraryName = getLibraryName(importedLibraries, sourceFile.fileName);
			if (importedLibraryName !== null) {
				const nodeIdentifier = (node as ts.DeclarationStatement).name;
				if (nodeIdentifier === undefined) {
					throw new Error(`Import/usage unnamed declaration: ${node.getText()}`);
				}

				const importName = nodeIdentifier.getText();
				normalLog(`Add import with name "${importName}" for library "${importedLibraryName}"`);

				let libraryImports = importedSymbols.get(importedLibraryName);
				if (libraryImports === undefined) {
					libraryImports = new Set<string>();
					importedSymbols.set(importedLibraryName, libraryImports);
				}

				libraryImports.add(importName);
				continue;
			}

			let nodeText = node.getText();

			const hasNodeExportKeyword = hasNodeModifier(node, ts.SyntaxKind.ExportKeyword);

			let shouldNodeHasExportKeyword = true;
			if (node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.EnumDeclaration) {
				if (options.failOnClass === true && node.kind === ts.SyntaxKind.ClassDeclaration) {
					const classDecl = (node as ts.ClassDeclaration);
					const className = classDecl.name ? classDecl.name.text : '';
					const errorMessage = `Class was found in generated dts.\n ${className} from ${sourceFile.fileName}`;
					throw new Error(errorMessage);
				}

				// not all classes and enums can be exported - only exported from root file
				shouldNodeHasExportKeyword = isDeclarationExported(rootFileExports, typeChecker, node as (ts.ClassDeclaration | ts.EnumDeclaration));
				if (node.kind === ts.SyntaxKind.EnumDeclaration) {
					// but const enum always can be exported
					shouldNodeHasExportKeyword = shouldNodeHasExportKeyword || hasNodeModifier(node, ts.SyntaxKind.ConstKeyword);
				}
			}

			nodeText = getTextAccordingExport(nodeText, hasNodeExportKeyword, shouldNodeHasExportKeyword);

			// add jsdoc for exported nodes only
			if (shouldNodeHasExportKeyword) {
				const start = node.getStart();
				const fullStart = node.getFullStart();
				const nodeJSDoc = sourceFileText.substring(fullStart, start).trim();
				if (nodeJSDoc.length !== 0) {
					nodeText = `${nodeJSDoc}\n${nodeText}`;
				}
			}

			fileOutput += `${spacesToTabs(nodeText)}\n`;
		}

		if (fileOutput.length === 0) {
			verboseLog(`No output for file: ${sourceFile.fileName}`);
		}

		if (options.outputFilenames) {
			fileOutput = `// File: ${sourceFile.fileName}\n\n${fileOutput}\n`;
		}

		resultOutput += fileOutput;
	}

	if (importedSymbols.size !== 0) {
		const importsArray: string[] = [];

		// we need to have sorted imports of libraries to have more "stable" output
		const sortedEntries = Array.from(importedSymbols.entries()).sort((firstEntry: [string, Set<string>], secondEntry: [string, Set<string>]) => {
			return firstEntry[0].localeCompare(secondEntry[0]);
		});

		for (const entry of sortedEntries) {
			const [libraryName, libraryImports] = entry;
			importsArray.push(generateImport(libraryName, Array.from(libraryImports)));
		}

		resultOutput = `${importsArray.join('\n')}\n\n${resultOutput}`;
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

function isDeclarationExported(exportedSymbols: ts.Symbol[], typeChecker: ts.TypeChecker, declaration: ts.NamedDeclaration): boolean {
	if (declaration.name === undefined) {
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

function spacesToTabs(text: string): string {
	return text.replace(/^(    )+/gm, (substring: string) => {
		return '\t'.repeat(substring.length / 4);
	});
}

function getLibraryName(libraries: string[], fileName: string): string | null {
	return libraries.find((library: string) => {
		const libraryPathPart = `node_modules/${library}`;
		return fileName.endsWith(libraryPathPart) || fileName.indexOf(`${libraryPathPart}/`) !== -1;
	}) || null;
}

function generateImport(libraryName: string, imports: string[]): string {
	// sort to make output more "stable"
	return `import { ${imports.sort().join(', ')} } from '${libraryName}';`;
}
