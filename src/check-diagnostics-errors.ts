import * as ts from 'typescript';
import { errorLog } from './logger';

const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
	getCanonicalFileName: (fileName: string) => ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

export function checkProgramDiagnosticsErrors(program: ts.Program): void {
	checkDiagnosticsErrors(ts.getPreEmitDiagnostics(program), 'Compiled with errors');
	checkDiagnosticsErrors(program.getDeclarationDiagnostics(), 'Compiled with errors');
}

export function checkDiagnosticsErrors(diagnostics: ReadonlyArray<ts.Diagnostic>, failMessage: string): void {
	if (diagnostics.length === 0) {
		return;
	}

	// `as ts.Diagnostic[]` we need to correct compile with TypeScript 2.5.1
	errorLog(ts.formatDiagnostics(diagnostics as ts.Diagnostic[], formatDiagnosticsHost).trim());
	throw new Error(failMessage);
}
