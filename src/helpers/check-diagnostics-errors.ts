import * as ts from 'typescript';
import { errorLog } from '../logger';

const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
	getCanonicalFileName: (fileName: string) => ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
	getCurrentDirectory: ts.sys.getCurrentDirectory,
	getNewLine: () => ts.sys.newLine,
};

export function checkProgramDiagnosticsErrors(program: ts.Program): void {
	checkDiagnosticsErrors(ts.getPreEmitDiagnostics(program), 'Compiled with errors');
	checkDiagnosticsErrors(program.getDeclarationDiagnostics(), 'Compiled with errors');
}

export function checkDiagnosticsErrors(diagnostics: readonly ts.Diagnostic[], failMessage: string): void {
	if (diagnostics.length === 0) {
		return;
	}

	errorLog(ts.formatDiagnostics(diagnostics, formatDiagnosticsHost).trim());
	throw new Error(failMessage);
}
