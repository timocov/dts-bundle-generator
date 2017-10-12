import * as ts from 'typescript';
import { errorLog } from './logger';

export function checkProgramDiagnosticsErrors(program: ts.Program): void {
	checkDiagnosticsErrors(ts.getPreEmitDiagnostics(program));
	checkDiagnosticsErrors(program.getDeclarationDiagnostics());
}

function checkDiagnosticsErrors(diagnostics: ReadonlyArray<ts.Diagnostic>): void {
	const errors: string[] = [];
	diagnostics.forEach((diagnostic: ts.Diagnostic) => {
		if (diagnostic.file === undefined || diagnostic.start === undefined) {
			return;
		}

		const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
		const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
		errors.push(`${diagnostic.file.fileName}(${line + 1},${character + 1}): TS${diagnostic.code}: ${message}`);
	});

	if (errors.length === 0) {
		return;
	}

	errorLog(errors.join('\n'));
	throw new Error('Compile with errors');
}
