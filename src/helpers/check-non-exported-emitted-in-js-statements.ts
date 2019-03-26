import * as ts from 'typescript';

import {
	getExportTypeForDeclaration,
	hasNodeModifier,
	SourceFileExport,
} from './typescript';

type EmittedInJsDeclaration = ts.ClassDeclaration | ts.EnumDeclaration | ts.FunctionDeclaration | ts.VariableDeclaration;

export function checkNonExportedEmittedInJsStatements(
	statements: ts.Statement[],
	rootFileExports: ReadonlyArray<SourceFileExport>,
	typeChecker: ts.TypeChecker
): void {
	const nonExportedExportableDeclarations: EmittedInJsDeclaration[] = [];

	for (const statement of statements) {
		// interfaces, types, module declarations, etc doesn't affect JS runtime
		// so we don't want to check them - only classes, enums (not const) and functions (maybe something else?)
		if (!ts.isClassDeclaration(statement) &&
			!ts.isEnumDeclaration(statement) &&
			!ts.isFunctionDeclaration(statement) &&
			!ts.isVariableStatement(statement)
		) {
			continue;
		}

		const statementDeclarations = ts.isVariableStatement(statement)
			? statement.declarationList.declarations
			: [statement];

		for (const declaration of statementDeclarations) {
			const exportType = getExportTypeForDeclaration(rootFileExports, typeChecker, declaration);
			const isConstEnum = ts.isEnumDeclaration(statement) && hasNodeModifier(statement, ts.SyntaxKind.ConstKeyword);

			if (exportType === null && !isConstEnum) {
				nonExportedExportableDeclarations.push(declaration);
			}
		}
	}

	if (nonExportedExportableDeclarations.length === 0) {
		return;
	}

	const errorSummary = `Generated dts contains ${nonExportedExportableDeclarations.length} non-exported declaration(s), which should be either exported or removed to avoid runtime errors`;

	const statementsText = nonExportedExportableDeclarations
		.map((statement: EmittedInJsDeclaration) => `${getDeclarationName(statement)} from ${statement.getSourceFile().fileName}`)
		.join('\n');

	throw new Error(`${errorSummary}:
${statementsText}
See https://github.com/timocov/dts-bundle-generator/issues/58 for more information.`);
}

function getDeclarationName(declaration: EmittedInJsDeclaration): string {
	if (declaration.name === undefined) {
		return `anonymous ${typeToString(declaration.kind)}`;
	}

	if (!ts.isIdentifier(declaration.name)) {
		throw new Error(`Cannot get name for declaration ${declaration.getText()}`);
	}

	return `"${declaration.name.text}" ${typeToString(declaration.kind)}`;
}

function typeToString(type: EmittedInJsDeclaration['kind']): string {
	switch (type) {
		case ts.SyntaxKind.ClassDeclaration:
			return 'class';

		case ts.SyntaxKind.EnumDeclaration:
			return 'enum';

		case ts.SyntaxKind.FunctionDeclaration:
			return 'function';

		case ts.SyntaxKind.VariableDeclaration:
			return 'variable';
	}
}
