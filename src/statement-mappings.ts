import * as ts from 'typescript';

import { OutputStatementPosition } from './generate-output';
import { DeclarationMapStore, GeneratedPosition, OriginalPosition } from './source-map';

interface TokenPosition {
	text: string;
	kind: ts.SyntaxKind;
	position: number;
}

export function mapStatementTokens(output: OutputStatementPosition, declarationMaps: DeclarationMapStore): GeneratedPosition[] {
	const sourceStatement = output.statement;
	const sourceFile = sourceStatement.getSourceFile();
	const sourceText = sourceStatement.getText(sourceFile);
	const originalTokens = scanTokens(sourceText);
	const printedTokens = scanTokens(output.text);
	const sourceStart = sourceStatement.getStart(sourceFile);
	const generatedFile = ts.createSourceFile('mapped-output.d.ts', output.text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
	const matchedTokens = matchTokens(originalTokens, printedTokens);
	const results: GeneratedPosition[] = [];

	for (const [printedIndex, sourceIndex] of matchedTokens) {
		const printed = printedTokens[printedIndex];
		const source = originalTokens[sourceIndex];
		const generated = generatedFile.getLineAndCharacterOfPosition(printed.position);
		const declaration = sourceFile.getLineAndCharacterOfPosition(sourceStart + source.position);
		const origin = declarationMaps.originalPositionFor(sourceFile.fileName, declaration.line, declaration.character)
			|| (!declarationMaps.hasMap(sourceFile.fileName) ? directDeclarationOrigin(sourceFile, declaration.line, declaration.character) : null);
		if (origin === null) {
			continue;
		}
		results.push({
			...origin,
			generatedLine: output.line + generated.line,
			generatedColumn: generated.line === 0 ? output.column + generated.character : generated.character,
		});
	}

	return results;
}

function directDeclarationOrigin(file: ts.SourceFile, line: number, column: number): OriginalPosition {
	return { fileName: file.fileName, line, column, content: file.text };
}

function scanTokens(text: string): TokenPosition[] {
	const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
	const result: TokenPosition[] = [];
	for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
		result.push({ text: scanner.getTokenText(), kind, position: scanner.getTokenPos() });
	}
	return result;
}

// eslint-disable-next-line complexity
function matchTokens(original: readonly TokenPosition[], printed: readonly TokenPosition[]): [number, number][] {
	const matches: [number, number][] = [];
	let originalIndex = 0;
	for (let printedIndex = 0; printedIndex < printed.length && originalIndex < original.length; printedIndex += 1) {
		const printedToken = printed[printedIndex];
		let candidate = originalIndex;
		while (candidate < original.length && candidate < originalIndex + 14 && !sameToken(original[candidate], printedToken)) {
			candidate += 1;
		}
		if (candidate >= original.length || candidate >= originalIndex + 14) {
			if (!isIdentifier(printedToken)) {
				continue;
			}
			candidate = originalIndex;
			while (candidate < original.length && candidate < originalIndex + 14 && !isIdentifier(original[candidate])) {
				candidate += 1;
			}
			if (candidate >= original.length || candidate >= originalIndex + 14) {
				continue;
			}
		}
		matches.push([printedIndex, candidate]);
		originalIndex = candidate + 1;
	}
	return matches;
}

function sameToken(left: TokenPosition, right: TokenPosition): boolean {
	return left.kind === right.kind && left.text === right.text;
}

function isIdentifier(token: TokenPosition): boolean {
	return token.kind === ts.SyntaxKind.Identifier;
}
