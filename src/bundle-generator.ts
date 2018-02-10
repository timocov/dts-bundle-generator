import * as ts from 'typescript';

import { compileDts } from './compile-dts';
import { TypesUsageEvaluator } from './types-usage-evaluator';
import {
	hasNodeModifier,
	isNodeNamedDeclaration,
} from './typescript-helpers';

import {
	getLibraryName,
	getTypesLibraryName,
	isTypescriptLibFile,
} from './node-modules-helpers';

import {
	normalLog,
	verboseLog,
} from './logger';

export interface GenerationOptions {
	outputFilenames?: boolean;
	failOnClass?: boolean;
	inlinedLibraries?: string[];
	importedLibraries?: string[];
	allowedTypesLibraries?: string[];
	umdModuleName?: string;
	preferredConfigPath?: string;
}

const skippedNodes = [
	ts.SyntaxKind.ExportDeclaration,
	ts.SyntaxKind.ImportDeclaration,
	ts.SyntaxKind.ImportEqualsDeclaration,
];

// tslint:disable-next-line:cyclomatic-complexity
export function generateDtsBundle(filePath: string, options: GenerationOptions = {}): string {
	const inlinedLibraries = options.inlinedLibraries || [];
	const importedLibraries = options.importedLibraries;
	const allowedTypesLibs = options.allowedTypesLibraries;

	if (!ts.sys.fileExists(filePath)) {
		throw new Error(`File "${filePath}" does not exist`);
	}

	const program = compileDts(filePath, options.preferredConfigPath);
	const typeChecker = program.getTypeChecker();

	// we do not need all files from node_modules dir
	const sourceFiles = program.getSourceFiles().filter((file: ts.SourceFile) => {
		const fileName = file.fileName;
		const libraryName = getLibraryName(fileName);
		if (libraryName === null) {
			return true;
		}

		if (isTypescriptLibFile(fileName)) {
			return false;
		}

		const typesLibName = getTypesLibraryName(fileName);
		if (typesLibName !== null) {
			return isLibraryAllowed(typesLibName, allowedTypesLibs);
		}

		return inlinedLibraries.indexOf(libraryName) !== -1 || isLibraryAllowed(libraryName, importedLibraries);
	});

	verboseLog(`Input source files:\n  ${sourceFiles.map((file: ts.SourceFile) => file.fileName).join('\n  ')}`);

	const typesUsageEvaluator = new TypesUsageEvaluator(sourceFiles, typeChecker);

	const rootSourceFile = getRootSourceFile(program);
	const rootSourceFileSymbol = typeChecker.getSymbolAtLocation(rootSourceFile);
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

	const usedTypes = new Set<string>();
	const importedSymbols = new Map<string, Set<string>>();

	let resultOutput = '';
	for (const sourceFile of sourceFiles) {
		verboseLog(`\n\n======= Preparing file: ${sourceFile.fileName} =======`);

		const sourceFileText = sourceFile.getFullText();

		const typesLibraryName = getTypesLibraryName(sourceFile.fileName);
		const importedLibraryName = getLibraryName(sourceFile.fileName);
		const shouldBeInlined = importedLibraryName !== null && inlinedLibraries.indexOf(importedLibraryName) !== -1;
		const isAllowedAsImportedLibrary = importedLibraryName !== null && isLibraryAllowed(importedLibraryName, importedLibraries);

		const isRootSourceFile = sourceFile === rootSourceFile;

		let fileOutput = '';
		for (const node of sourceFile.statements) {
			// we should skip import and exports statements
			if (skippedNodes.indexOf(node.kind) !== -1) {
				continue;
			}

			let isNodeUsed = false;
			if (ts.isExportAssignment(node)) {
				// we should skip `export default` expressions from non-root files and `export =` from all files
				if (node.isExportEquals || !isRootSourceFile) {
					continue;
				}

				isNodeUsed = true;
			} else if (isNodeNamedDeclaration(node)) {
				isNodeUsed = rootFileExports.some(typesUsageEvaluator.isTypeUsedBySymbol.bind(typesUsageEvaluator, node));
			} else if (ts.isVariableStatement(node)) {
				const declarations = node.declarationList.declarations;
				isNodeUsed = declarations.some((declaration: ts.VariableDeclaration) => {
					return isDeclarationExported(rootFileExports, typeChecker, declaration);
				});
			}

			if (!isNodeUsed) {
				verboseLog(`Skip file member: ${node.getText().replace(/(\n|\r)/g, '').slice(0, 50)}...`);
				continue;
			}

			if (typesLibraryName !== null) {
				if (!usedTypes.has(typesLibraryName)) {
					normalLog(`Library "${typesLibraryName}" will be added via reference directive`);
					usedTypes.add(typesLibraryName);
				}

				break;
			}

			if (importedLibraryName !== null && isAllowedAsImportedLibrary && !shouldBeInlined) {
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

			const hasNodeExportKeyword = ts.isExportAssignment(node) || hasNodeModifier(node, ts.SyntaxKind.ExportKeyword);

			let shouldNodeHasExportKeyword = true;

			if (ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
				if (options.failOnClass === true && ts.isClassDeclaration(node)) {
					const className = node.name ? node.name.text : '';
					const errorMessage = `Class was found in generated dts.\n ${className} from ${sourceFile.fileName}`;
					throw new Error(errorMessage);
				}

				// not all classes and enums can be exported - only exported from root file
				shouldNodeHasExportKeyword = isDeclarationExported(rootFileExports, typeChecker, node);
				if (ts.isEnumDeclaration(node)) {
					// but const enum always can be exported
					shouldNodeHasExportKeyword = shouldNodeHasExportKeyword || hasNodeModifier(node, ts.SyntaxKind.ConstKeyword);
				}
			}

			nodeText = getTextAccordingExport(nodeText, hasNodeExportKeyword, shouldNodeHasExportKeyword);

			// strip the `default` keyword from node if it is not from entry file
			if (hasNodeModifier(node, ts.SyntaxKind.DefaultKeyword) && !isRootSourceFile) {
				// we need to just remove `default` from any node except class
				// for classes we need to replace `default` with `declare` instead
				nodeText = nodeText.replace(/\bdefault\s/, ts.isClassDeclaration(node) ? 'declare ' : '');
			}

			// add jsdoc for exported nodes only
			if (shouldNodeHasExportKeyword) {
				const start = node.getStart();
				const jsDocStart = node.getStart(undefined, true);
				const nodeJSDoc = sourceFileText.substring(jsDocStart, start).trim();
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

	if (usedTypes.size !== 0) {
		const header = generateReferenceTypesDirective(Array.from(usedTypes));
		resultOutput = `${header}\n\n${resultOutput}`;
	}

	if (options.umdModuleName !== undefined) {
		resultOutput += `\nexport as namespace ${options.umdModuleName};\n`;
	}

	return resultOutput;
}

function getRootSourceFile(program: ts.Program): ts.SourceFile {
	const rootFiles = program.getRootFileNames();
	if (rootFiles.length !== 1) {
		verboseLog(`Root files:\n  ${rootFiles.join('\n  ')}`);
		throw new Error(`There is not one root file - ${rootFiles.length}`);
	}

	const sourceFileName = rootFiles[0];
	const sourceFile = program.getSourceFile(sourceFileName);
	if (sourceFile === undefined) {
		throw new Error(`Cannot get source file for root file ${sourceFileName}`);
	}

	return sourceFile;
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

function spacesToTabs(text: string): string {
	return text.replace(/^(    )+/gm, (substring: string) => {
		return '\t'.repeat(substring.length / 4);
	});
}

function generateImport(libraryName: string, imports: string[]): string {
	// sort to make output more "stable"
	return `import { ${imports.sort().join(', ')} } from '${libraryName}';`;
}

function generateReferenceTypesDirective(libraries: string[]): string {
	return libraries.sort().map((library: string) => {
		return `/// <reference types="${library}" />`;
	}).join('\n');
}

function isLibraryAllowed(libraryName: string, allowedArray?: string[]): boolean {
	return allowedArray === undefined || allowedArray.indexOf(libraryName) !== -1;
}
