import * as path from 'path';
import * as ts from 'typescript';

import { fixPath } from './helpers/fix-path';

export interface RawSourceMap {
	version: number;
	file?: string;
	sourceRoot?: string;
	sources: string[];
	sourcesContent?: (string | null)[];
	names?: string[];
	mappings: string;
}

export interface OriginalPosition {
	fileName: string;
	line: number;
	column: number;
	content?: string;
}

export interface GeneratedPosition extends OriginalPosition {
	generatedLine: number;
	generatedColumn: number;
}

interface DecodedSegment {
	generatedColumn: number;
	sourceIndex?: number;
	sourceLine?: number;
	sourceColumn?: number;
}

interface SourceMapConsumerData {
	mapPath: string;
	map: RawSourceMap;
	lines: DecodedSegment[][];
}

const base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Values = new Map(Array.from(base64Characters).map((character, index) => [character, index]));

export class DeclarationMapStore {
	private readonly maps: Map<string, SourceMapConsumerData> = new Map();
	private readonly canonicalFileName: (fileName: string) => string;

	public constructor(canonicalFileName: (fileName: string) => string) {
		this.canonicalFileName = canonicalFileName;
	}

	public add(mapPath: string, mapText: string): void {
		let map: RawSourceMap;
		try {
			map = JSON.parse(mapText) as RawSourceMap;
		} catch (error) {
			throw new Error(`Cannot parse declaration map ${mapPath}: ${(error as Error).message}`);
		}

		if (map.version !== 3 || !Array.isArray(map.sources) || typeof map.mappings !== 'string') {
			throw new Error(`Unsupported declaration map ${mapPath}`);
		}

		const declarationPath = mapPath.replace(/\.map$/u, '');
		this.maps.set(this.canonicalFileName(declarationPath), {
			mapPath,
			map,
			lines: decodeMappings(map.mappings, map.sources.length),
		});
	}

	public originalPositionFor(declarationFileName: string, line: number, column: number): OriginalPosition | null {
		const data = this.maps.get(this.canonicalFileName(declarationFileName));
		if (data === undefined) {
			return null;
		}

		const segments = data.lines[line] || [];
		let selected: DecodedSegment | undefined;
		for (const segment of segments) {
			if (segment.generatedColumn > column) {
				break;
			}
			selected = segment;
		}

		if (selected?.sourceIndex === undefined || selected.sourceLine === undefined || selected.sourceColumn === undefined) {
			return null;
		}

		const source = data.map.sources[selected.sourceIndex];
		if (source === undefined) {
			return null;
		}

		const sourceRoot = data.map.sourceRoot || '';
		const fileName = path.resolve(path.dirname(data.mapPath), sourceRoot, source);
		return {
			fileName,
			line: selected.sourceLine,
			column: selected.sourceColumn + Math.max(0, column - selected.generatedColumn),
			content: data.map.sourcesContent?.[selected.sourceIndex] || ts.sys.readFile(fileName),
		};
	}

	public hasMap(declarationFileName: string): boolean {
		return this.maps.has(this.canonicalFileName(declarationFileName));
	}
}

export interface SourceMapOptions {
	outputFile: string;
	sourceRoot?: string;
	inlineSources?: boolean;
}

export function generateSourceMap(points: readonly GeneratedPosition[], options: SourceMapOptions): string {
	const mapFile = `${options.outputFile}.map`;
	const sortedPoints = [...points].sort(compareGeneratedPositions);
	const canonicalPoints = sortedPoints.filter((point, index) => index === 0 || !sameGeneratedPosition(point, sortedPoints[index - 1]));
	const sources: string[] = [];
	const contents: (string | null)[] = [];
	const sourceIndexes = new Map<string, number>();

	for (const point of canonicalPoints) {
		const key = path.resolve(point.fileName);
		if (sourceIndexes.has(key)) {
			continue;
		}
		sourceIndexes.set(key, sources.length);
		sources.push(sourceDisplayPath(key, mapFile, options.sourceRoot));
		contents.push(point.content ?? null);
	}

	const map: RawSourceMap = {
		version: 3,
		file: path.basename(options.outputFile),
		sourceRoot: options.sourceRoot === undefined ? '' : normalizeSlashes(options.sourceRoot),
		sources,
		mappings: encodeMappings(canonicalPoints, sourceIndexes),
	};

	if (options.inlineSources) {
		map.sourcesContent = contents;
	}

	return JSON.stringify(map);
}

function sourceDisplayPath(fileName: string, mapFile: string, sourceRoot: string | undefined): string {
	const base = sourceRoot === undefined
		? path.dirname(mapFile)
		: path.resolve(path.dirname(mapFile), sourceRoot);
	return normalizeSlashes(path.relative(base, fileName) || path.basename(fileName));
}

function normalizeSlashes(value: string): string {
	return fixPath(value).replace(/\\/gu, '/');
}

function sameGeneratedPosition(left: GeneratedPosition, right: GeneratedPosition): boolean {
	return left.generatedLine === right.generatedLine && left.generatedColumn === right.generatedColumn;
}

function compareGeneratedPositions(left: GeneratedPosition, right: GeneratedPosition): number {
	return left.generatedLine - right.generatedLine || left.generatedColumn - right.generatedColumn;
}

function decodeMappings(value: string, sourceCount: number): DecodedSegment[][] {
	const lines: DecodedSegment[][] = [];
	let sourceIndex = 0;
	let sourceLine = 0;
	let sourceColumn = 0;

	for (const encodedLine of value.split(';')) {
		let generatedColumn = 0;
		const line: DecodedSegment[] = [];
		for (const encodedSegment of encodedLine.split(',')) {
			if (encodedSegment.length === 0) {
				continue;
			}
			const fields = decodeVlqSequence(encodedSegment);
			if (![1, 4, 5].includes(fields.length) || fields[0] < 0) {
				throw new Error('Invalid declaration map segment');
			}
			generatedColumn += fields[0];
			const segment: DecodedSegment = { generatedColumn };
			if (fields.length >= 4) {
				sourceIndex += fields[1];
				sourceLine += fields[2];
				sourceColumn += fields[3];
				if (sourceIndex < 0 || sourceIndex >= sourceCount || sourceLine < 0 || sourceColumn < 0) {
					throw new Error('Invalid declaration map source index or position');
				}
				segment.sourceIndex = sourceIndex;
				segment.sourceLine = sourceLine;
				segment.sourceColumn = sourceColumn;
			}
			line.push(segment);
		}
		lines.push(line);
	}
	return lines;
}

function encodeMappings(points: readonly GeneratedPosition[], sourceIndexes: ReadonlyMap<string, number>): string {
	if (points.length === 0) {
		return '';
	}

	const lines: string[][] = [];
	let previousSourceIndex = 0;
	let previousSourceLine = 0;
	let previousSourceColumn = 0;
	let pointIndex = 0;

	for (let generatedLine = 0; generatedLine <= points[points.length - 1].generatedLine; generatedLine += 1) {
		const segments: string[] = [];
		let previousGeneratedColumn = 0;
		while (pointIndex < points.length && points[pointIndex].generatedLine === generatedLine) {
			const point = points[pointIndex];
			const sourceIndex = sourceIndexes.get(path.resolve(point.fileName));
			if (sourceIndex !== undefined) {
				segments.push([
					point.generatedColumn - previousGeneratedColumn,
					sourceIndex - previousSourceIndex,
					point.line - previousSourceLine,
					point.column - previousSourceColumn,
				].map(encodeVlq).join(''));
				previousGeneratedColumn = point.generatedColumn;
				previousSourceIndex = sourceIndex;
				previousSourceLine = point.line;
				previousSourceColumn = point.column;
			}
			pointIndex += 1;
		}
		lines.push(segments);
	}

	return lines.map(line => line.join(',')).join(';');
}

function decodeVlqSequence(value: string): number[] {
	const result: number[] = [];
	let accumulated = 0;
	let shift = 0;
	for (const character of value) {
		const digit = base64Values.get(character);
		if (digit === undefined) {
			throw new Error(`Invalid base64 VLQ character ${character}`);
		}
		accumulated += (digit & 31) << shift;
		if ((digit & 32) !== 0) {
			shift += 5;
			continue;
		}
		const negative = (accumulated & 1) === 1;
		const decoded = accumulated >> 1;
		result.push(negative ? -decoded : decoded);
		accumulated = 0;
		shift = 0;
	}
	if (shift !== 0) {
		throw new Error('Invalid unterminated base64 VLQ value');
	}
	return result;
}

function encodeVlq(value: number): string {
	let encodedValue = value < 0 ? ((-value) << 1) + 1 : value << 1;
	let result = '';
	do {
		let digit = encodedValue & 31;
		encodedValue >>>= 5;
		if (encodedValue > 0) {
			digit |= 32;
		}
		result += base64Characters[digit];
	} while (encodedValue > 0);
	return result;
}
