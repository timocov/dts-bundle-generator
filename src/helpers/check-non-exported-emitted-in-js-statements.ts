import * as ts from 'typescript';

import {
	getExportTypeForDeclaration,
	hasNodeModifier,
	SourceFileExport,
} from './typescript';

type EmittedInJsDeclaration = ts.ClassDeclaration | ts.EnumDeclaration | ts.FunctionDeclaration;

export function checkNonExportedEmittedInJsStatements(
	statements: ts.Statement[],
	rootFileExports: ReadonlyArray<SourceFileExport>,
	typeChecker: ts.TypeChecker
): void {
	const nonExportedExportableStatements = statements
		.filter((statement: ts.Statement) => {
			// interfaces, types, module declarations, etc doesn't affect JS runtime
			// so we don't want to check them - only classes, enums (not const) and functions (maybe something else?)
			if (!ts.isClassDeclaration(statement) && !ts.isEnumDeclaration(statement) && !ts.isFunctionDeclaration(statement)) {
				return false;
			}

			const exportType = getExportTypeForDeclaration(rootFileExports, typeChecker, statement);
			const isConstEnum = ts.isEnumDeclaration(statement) && hasNodeModifier(statement, ts.SyntaxKind.ConstKeyword);

			// const enum always can be exported
			return exportType === null && !isConstEnum;
		}) as EmittedInJsDeclaration[];

	if (nonExportedExportableStatements.length === 0) {
		return;
	}

	const errorSummary = `Generated dts contains ${nonExportedExportableStatements.length} non-exported declaration(s), which should be either exported or removed to avoid runtime errors`;

	const statementsText = nonExportedExportableStatements
		.map((statement: EmittedInJsDeclaration) => {
			const name = statement.name === undefined
				? `anonymous ${typeToString(statement.kind)}`
				: `${statement.name.text} ${typeToString(statement.kind)}`;
			return `${name} from ${statement.getSourceFile().fileName}`;
		})
		.join('\n');

	throw new Error(`${errorSummary}:
${statementsText}
See https://github.com/timocov/dts-bundle-generator/issues/58 for more information.`);
}

function typeToString(type: EmittedInJsDeclaration['kind']): string {
	switch (type) {
		case ts.SyntaxKind.ClassDeclaration:
			return 'class';

		case ts.SyntaxKind.EnumDeclaration:
			return 'enum';

		case ts.SyntaxKind.FunctionDeclaration:
			return 'function';
	}
}
