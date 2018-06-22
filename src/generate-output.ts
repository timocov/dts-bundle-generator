import * as ts from 'typescript';

import { hasNodeModifier } from './typescript-helpers';

export interface OutputParams {
	typesReferences: Set<string>;
	imports: Map<string, Set<string>>;
	statements: ReadonlyArray<ts.Statement>;
	shouldStatementHasExportKeyword(statement: ts.Statement): boolean;
	needStripDefaultKeywordForStatement(statement: ts.Statement): boolean;
}

export interface OutputOptions {
	umdModuleName?: string;
	sortStatements?: boolean;
}

export function generateOutput(params: OutputParams, options: OutputOptions = {}): string {
	let resultOutput = '';

	if (params.typesReferences.size !== 0) {
		const header = generateReferenceTypesDirective(Array.from(params.typesReferences));
		resultOutput += `${header}\n\n`;
	}

	if (params.imports.size !== 0) {
		// we need to have sorted imports of libraries to have more "stable" output
		const sortedEntries = Array.from(params.imports.entries()).sort((firstEntry: [string, Set<string>], secondEntry: [string, Set<string>]) => {
			return firstEntry[0].localeCompare(secondEntry[0]);
		});

		const importsArray = sortedEntries.map((entry: [string, Set<string>]) => {
			const [libraryName, libraryImports] = entry;
			return generateImport(libraryName, Array.from(libraryImports));
		});

		resultOutput += `${importsArray.join('\n')}\n\n`;
	}

	const statements = params.statements.map(
		(statement: ts.Statement) => {
			return getStatementText(
				statement,
				params.shouldStatementHasExportKeyword(statement),
				params.needStripDefaultKeywordForStatement(statement)
			);
		}
	);

	if (options.sortStatements) {
		statements.sort();
	}

	resultOutput += statements.join('\n');

	if (options.umdModuleName !== undefined) {
		resultOutput += `\n\nexport as namespace ${options.umdModuleName};\n`;
	}

	return resultOutput;
}

function getStatementText(statement: ts.Statement, shouldStatementHasExportKeyword: boolean, needStripDefaultKeyword: boolean): string {
	const hasStatementExportKeyword = ts.isExportAssignment(statement) || hasNodeModifier(statement, ts.SyntaxKind.ExportKeyword);

	let nodeText = getTextAccordingExport(statement.getText(), hasStatementExportKeyword, shouldStatementHasExportKeyword);

	// strip the `default` keyword from node
	if (hasNodeModifier(statement, ts.SyntaxKind.DefaultKeyword) && needStripDefaultKeyword) {
		// we need just to remove `default` from any node except class node
		// for classes we need to replace `default` with `declare` instead
		nodeText = nodeText.replace(/\bdefault\s/, ts.isClassDeclaration(statement) ? 'declare ' : '');
	}

	// for some reason TypeScript allows to do not write `declare` keyword for ClassDeclaration
	// if it already has `export` keyword - so we need to add it
	if (ts.isClassDeclaration(statement) && /^class\b/.test(nodeText)) {
		nodeText = `declare ${nodeText}`;
	}

	// add jsdoc for exported nodes only
	if (shouldStatementHasExportKeyword) {
		const start = statement.getStart();
		const jsDocStart = statement.getStart(undefined, true);
		const nodeJSDoc = statement.getSourceFile().getFullText().substring(jsDocStart, start).trim();
		if (nodeJSDoc.length !== 0) {
			nodeText = `${nodeJSDoc}\n${nodeText}`;
		}
	}

	return spacesToTabs(nodeText);
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
