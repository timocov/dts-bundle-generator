import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as ts from 'typescript';

import { generateDtsBundle, OutputOptions as ExistingOutputOptions } from '../../src/bundle-generator';

interface OutputOptions extends ExistingOutputOptions {
	declarationMap?: boolean;
	declarationMapInlineSources?: boolean;
	declarationMapSourceRoot?: string;
}

interface RawSourceMap {
	version: number;
	file?: string;
	sourceRoot?: string;
	sources: string[];
	sourcesContent?: (string | null)[];
	mappings: string;
}

interface MapOrigin {
	fileName: string;
	line: number;
	column: number;
}

interface BundleWithMap {
	declarationText: string;
	declarationMap: string | null;
}

function generateAll(entries: { filePath: string; output?: OutputOptions }[], config: { preferredConfigPath: string }, names?: string[]): BundleWithMap[] {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const bundleModule = require('../../src/bundle-generator') as {
		generateDtsBundleWithMaps?: (values: { filePath: string; output?: OutputOptions }[], options: { preferredConfigPath: string }, outputNames?: string[]) => BundleWithMap[];
	};
	assert.strictEqual(typeof bundleModule.generateDtsBundleWithMaps, 'function', 'structured declaration-map API is missing');
	return (bundleModule.generateDtsBundleWithMaps as NonNullable<typeof bundleModule.generateDtsBundleWithMaps>)(entries, config, names);
}

interface MapStore {
	add(mapPath: string, mapText: string): void;
	originalPositionFor(declarationFileName: string, line: number, column: number): MapOrigin | null;
}

type MapStoreConstructor = new (canonicalName: (name: string) => string) => MapStore;

function mapStore(): MapStoreConstructor {
	/* eslint-disable @typescript-eslint/naming-convention */
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const sourceMapModule = require('../../src/source-map') as { DeclarationMapStore?: MapStoreConstructor };
	/* eslint-enable @typescript-eslint/naming-convention */
	assert.strictEqual(typeof sourceMapModule.DeclarationMapStore, 'function', 'declaration-map consumer is missing');
	return sourceMapModule.DeclarationMapStore as MapStoreConstructor;
}

interface Fixture {
	directory: string;
	config: string;
	file(name: string, content: string): string;
}

function fixture(): Fixture {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dts-bundle-map-'));
	const config = path.join(directory, 'tsconfig.json');
	fs.writeFileSync(config, JSON.stringify({ compilerOptions: { strict: true, target: 'es2020', module: 'commonjs' } }));
	return {
		directory,
		config,
		file(name: string, content: string): string {
			const fileName = path.join(directory, name);
			fs.mkdirSync(path.dirname(fileName), { recursive: true });
			fs.writeFileSync(fileName, content);
			return fileName;
		},
	};
}

function generate(input: string, config: string, output: OutputOptions, outputFile?: string) {
	return generateAll(
		[{ filePath: input, output }],
		{ preferredConfigPath: config },
		outputFile === undefined ? undefined : [outputFile]
	)[0];
}

function parseMap(value: string | null): RawSourceMap {
	assert.notStrictEqual(value, null);
	return JSON.parse(value as string) as RawSourceMap;
}

function mappedLines(mappings: string): number[] {
	return mappings.split(';').flatMap((line, index) => line.length === 0 ? [] : [index]);
}

function decodedOrigin(result: { declarationText: string; declarationMap: string | null }, outputFile: string, token: string): { fileName: string; line: number; column: number } | null {
	const position = result.declarationText.indexOf(token);
	assert(position >= 0, `Output token ${token} not found`);
	return decodedOriginAt(result, outputFile, position);
}

function decodedOriginAt(result: { declarationText: string; declarationMap: string | null }, outputFile: string, position: number): MapOrigin | null {
	const prior = result.declarationText.slice(0, position);
	const line = prior.split('\n').length - 1;
	const column = prior.length - prior.lastIndexOf('\n') - 1;
	const store = new (mapStore())(value => value);
	store.add(`${outputFile}.map`, result.declarationMap as string);
	return store.originalPositionFor(outputFile, line, column);
}

describe('declaration maps', () => {
	it('preserves declaration output exactly when maps are disabled', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export interface Public { value: string; }\n');
		const legacy = generateDtsBundle([{ filePath: input, output: { noBanner: true } }], { preferredConfigPath: files.config });
		const structured = generate(input, files.config, { noBanner: true });
		assert.strictEqual(structured.declarationMap, null);
		assert.strictEqual(structured.declarationText, legacy[0]);
		fs.writeFileSync(files.config, JSON.stringify({ compilerOptions: { strict: true, target: 'es2020', module: 'commonjs', declarationMap: true } }));
		const configured = generate(input, files.config, { noBanner: true });
		assert.strictEqual(configured.declarationMap, null);
		assert.strictEqual(configured.declarationText.includes('sourceMappingURL='), false);
	});

	it('emits deterministic Source Map v3 text and one final relative comment', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export type Public = string;\n');
		const output = path.join(files.directory, 'nested', 'bundle.d.ts');
		const first = generate(input, files.config, { declarationMap: true }, output);
		const second = generate(input, files.config, { declarationMap: true }, output);
		assert.strictEqual(first.declarationMap, second.declarationMap);
		assert.strictEqual((first.declarationText.match(/sourceMappingURL=/gu) || []).length, 1);
		assert(first.declarationText.endsWith('//# sourceMappingURL=bundle.d.ts.map\n'));
		assert.strictEqual(parseMap(first.declarationMap).version, 3);
	});

	it('returns declaration and map text without filesystem writes', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export const value = 1;\n');
		const output = path.join(files.directory, 'not-written', 'index.d.ts');
		const result = generate(input, files.config, { declarationMap: true }, output);
		assert.match(result.declarationText, /declare const value = 1/u);
		assert.notStrictEqual(result.declarationMap, null);
		assert.strictEqual(fs.existsSync(output), false);
		assert.strictEqual(fs.existsSync(`${output}.map`), false);
	});

	it('accepts equivalent independent map controls in CommonJS config', () => {
		const files = fixture();
		files.file('input.ts', 'export interface Public {}\n');
		const configFile = files.file('bundle.config.js', `module.exports = { entries: [{ filePath: './input.ts', outFile: './dist/index.d.ts', output: { declarationMap: true, declarationMapInlineSources: true, declarationMapSourceRoot: '../source' } }] };\n`);
		// The internal loader is intentionally stripped from the package's public declarations.
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const loaded = require('../../src/config-file/load-config-file').loadConfigFile(configFile) as {
			entries: { filePath: string; outFile?: string; output?: OutputOptions }[];
		};
		assert.strictEqual(loaded.entries[0].output?.declarationMap, true);
		assert.strictEqual(loaded.entries[0].output?.declarationMapInlineSources, true);
		assert.strictEqual(loaded.entries[0].output?.declarationMapSourceRoot, '../source');
		assert.strictEqual(loaded.entries[0].outFile, path.join(files.directory, 'dist/index.d.ts'));
	});

	it('writes independent adjacent maps through CLI config', () => {
		const files = fixture();
		files.file('first.ts', 'export interface First { value: string; }\n');
		files.file('second.ts', 'export interface Second { value: number; }\n');
		const configFile = files.file('bundle.config.json', JSON.stringify({
			entries: [
				{ filePath: './first.ts', outFile: './out/first.d.ts', output: { declarationMap: true, declarationMapInlineSources: true } },
				{ filePath: './second.ts', outFile: './out/second.d.ts', output: { declarationMap: false } },
			],
			compilationOptions: { preferredConfigPath: files.config },
		}));
		const cli = path.resolve(__dirname, '../../dist/bin/dts-bundle-generator.js');
		childProcess.execFileSync(process.execPath, [cli, '--config', configFile, '--silent']);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'out/first.d.ts.map')), true);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'out/second.d.ts.map')), false);
		assert(fs.readFileSync(path.join(files.directory, 'out/first.d.ts'), 'utf-8').includes('sourceMappingURL=first.d.ts.map'));
		assert.strictEqual(parseMap(fs.readFileSync(path.join(files.directory, 'out/first.d.ts.map'), 'utf-8')).sourcesContent?.length, 1);
	});

	it('composes retained declarations to original sources and maps declaration inputs directly', () => {
		const files = fixture();
		files.file('model.ts', 'export interface Model { id: string; }\n');
		const input = files.file('input.ts', "export { Model } from './model';\n");
		const generated = parseMap(generate(input, files.config, { declarationMap: true }, path.join(files.directory, 'out.d.ts')).declarationMap);
		assert.deepStrictEqual(generated.sources, ['model.ts']);

		const declarationInput = files.file('types.d.ts', 'export interface Direct { id: string; }\n');
		const direct = parseMap(generate(declarationInput, files.config, { declarationMap: true }, path.join(files.directory, 'direct.d.ts')).declarationMap);
		assert.deepStrictEqual(direct.sources, ['types.d.ts']);
	});

	it('maps emitted JavaScript declarations to original JavaScript input', () => {
		const files = fixture();
		fs.writeFileSync(files.config, JSON.stringify({ compilerOptions: { strict: true, allowJs: true, outDir: './build', target: 'es2020', module: 'commonjs' } }));
		const input = files.file('input.js', '/** @typedef {{ item: string }} RecordValue */\n/** @type {RecordValue} */\nexport const output = { item: "yes" };\n');
		const output = path.join(files.directory, 'out.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true }, output);
		assert.strictEqual(path.basename(decodedOrigin(result, output, 'output')?.fileName || ''), 'input.js');
		assert.strictEqual(parseMap(result.declarationMap).sources[0], 'input.js');
	});

	it('tracks final placement after sorting and collision renaming', () => {
		const files = fixture();
		files.file('a.ts', 'export interface Same { fromA: string; }\n');
		files.file('b.ts', 'export interface Same { fromB: number; }\n');
		const input = files.file('input.ts', "export { Same as Zed } from './a';\nexport { Same as Alpha } from './b';\n");
		const output = path.join(files.directory, 'out.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true, sortNodes: true }, output);
		const map = parseMap(result.declarationMap);
		assert(result.declarationText.includes('fromA'));
		assert(result.declarationText.includes('fromB'));
		assert.deepStrictEqual(new Set(map.sources), new Set(['a.ts', 'b.ts']));
		assert(mappedLines(map.mappings).length >= 2);
		assert.strictEqual(path.basename(decodedOrigin(result, output, 'fromA')?.fileName || ''), 'a.ts');
		assert.strictEqual(path.basename(decodedOrigin(result, output, 'fromB')?.fileName || ''), 'b.ts');
		assert.strictEqual(decodedOrigin(result, output, 'fromA')?.line, 0);
		assert.strictEqual(decodedOrigin(result, output, 'fromA')?.column, 'export interface Same { fromA: string; }'.indexOf('fromA'));
		assert.strictEqual(decodedOrigin(result, output, 'fromB')?.column, 'export interface Same { fromB: number; }'.indexOf('fromB'));
		const printed = ts.createSourceFile(output, result.declarationText, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
		const interfaces = printed.statements.filter(ts.isInterfaceDeclaration);
		assert.strictEqual(interfaces.length, 2);
		for (const declaration of interfaces) {
			const member = declaration.members[0];
			const expected = member.getText(printed).includes('fromA') ? 'a.ts' : 'b.ts';
			const origin = decodedOriginAt(result, output, declaration.name.getStart(printed));
			assert.strictEqual(path.basename(origin?.fileName || ''), expected);
			assert.strictEqual(origin?.column, 'export interface Same'.indexOf('Same'));
		}
	});

	it('maps members on distinct original lines after declaration reprinting', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export interface Public {\n  first: string;\n  second: number;\n}\n');
		const output = path.join(files.directory, 'out.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true }, output);
		assert.strictEqual(decodedOrigin(result, output, 'first')?.line, 1);
		assert.strictEqual(decodedOrigin(result, output, 'second')?.line, 2);
		assert.strictEqual(decodedOrigin(result, output, 'Public')?.line, 0);
		assert.strictEqual(decodedOrigin(result, output, 'first')?.column, 2);
		assert.strictEqual(decodedOrigin(result, output, 'second')?.column, 2);
	});

	it('preserves repeated member origins and does not map generated UMD markers', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export interface Repeated {\n  value: string;\n  nested: {\n    value: number;\n  };\n}\n');
		const output = path.join(files.directory, 'out.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true, umdModuleName: 'SyntheticUMD' }, output);
		const first = result.declarationText.indexOf('value');
		const second = result.declarationText.indexOf('value', first + 1);
		assert(second > first);
		const firstPrior = result.declarationText.slice(0, first);
		const secondPrior = result.declarationText.slice(0, second);
		const firstLine = firstPrior.split('\n').length - 1;
		const secondLine = secondPrior.split('\n').length - 1;
		const store = new (mapStore())(value => value);
		store.add(`${output}.map`, result.declarationMap as string);
		assert.strictEqual(store.originalPositionFor(output, firstLine, firstPrior.length - firstPrior.lastIndexOf('\n') - 1)?.line, 1);
		assert.strictEqual(store.originalPositionFor(output, secondLine, secondPrior.length - secondPrior.lastIndexOf('\n') - 1)?.line, 3);
		assert.strictEqual(decodedOrigin(result, output, 'SyntheticUMD'), null);
	});

	it('uses final sorted output locations instead of source traversal order', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export interface Zeta {\n  last: string;\n}\nexport interface Alpha {\n  first: number;\n}\n');
		const output = path.join(files.directory, 'out.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true, sortNodes: true }, output);
		assert(result.declarationText.indexOf('Alpha') < result.declarationText.indexOf('Zeta'));
		assert.strictEqual(decodedOrigin(result, output, 'first')?.line, 4);
		assert.strictEqual(decodedOrigin(result, output, 'last')?.line, 1);
	});

	it('retains source origins across import-type and namespace transformations', () => {
		const files = fixture();
		files.file('model.ts', 'export interface Model {\n  detail: string;\n}\n');
		const input = files.file('input.ts', "export type Use = import('./model').Model;\nexport * as Group from './model';\n");
		const output = path.join(files.directory, 'out.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true }, output);
		assert.strictEqual(decodedOrigin(result, output, 'Use')?.line, 0);
		assert.strictEqual(path.basename(decodedOrigin(result, output, 'detail')?.fileName || ''), 'model.ts');
		assert.strictEqual(decodedOrigin(result, output, 'detail')?.line, 1);
		assert.strictEqual(decodedOrigin(result, output, 'Group'), null, 'synthetic namespace export must not inherit a declaration origin');
	});

	it('leaves synthesized and removed output unmapped', () => {
		const files = fixture();
		files.file('unused.ts', 'export interface Removed { no: string; }\n');
		const input = files.file('input.ts', "import { Removed } from './unused';\nexport interface Kept { yes: number; }\n");
		const result = generate(input, files.config, { declarationMap: true }, path.join(files.directory, 'out.d.ts'));
		const map = parseMap(result.declarationMap);
		const lines = mappedLines(map.mappings);
		assert.deepStrictEqual(map.sources, ['input.ts']);
		assert.strictEqual(lines.includes(0), false, 'banner must be unmapped');
		assert.strictEqual(lines.includes(result.declarationText.trimEnd().split('\n').length - 1), false, 'map comment must be unmapped');
	});

	it('normalizes metadata, source roots, embedded CRLF content, Unicode, and same basenames', () => {
		const files = fixture();
		files.file('left/model.ts', 'export interface Left { caf\u00e9: string; }\r\n');
		files.file('right/model.ts', 'export interface Right { value: number; }\r\n');
		const input = files.file('input.ts', "export { Left } from './left/model';\nexport { Right } from './right/model';\n");
		const output = path.join(files.directory, 'dist', 'types', 'index.d.ts');
		const first = parseMap(generate(input, files.config, { declarationMap: true, declarationMapInlineSources: true, declarationMapSourceRoot: '../..' }, output).declarationMap);
		const second = parseMap(generate(input, files.config, { declarationMap: true, declarationMapInlineSources: true, declarationMapSourceRoot: '../..' }, output).declarationMap);
		assert.strictEqual(first.file, 'index.d.ts');
		assert.strictEqual(first.sourceRoot, '../..');
		assert.strictEqual(Object.prototype.hasOwnProperty.call(first, 'names'), false);
		assert(first.sources.every(source => !source.includes('\\')));
		assert.deepStrictEqual(first.sources, ['left/model.ts', 'right/model.ts']);
		assert(first.sourcesContent?.[0]?.includes('caf\u00e9'));
		assert.deepStrictEqual(first, second);
	});

	it('rejects orphan map options and malformed intermediate maps', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export type Public = string;\n');
		assert.throws(() => generate(input, files.config, { declarationMapInlineSources: true }), /requires declarationMap/u);
		assert.throws(() => generate(input, files.config, { declarationMapSourceRoot: 'src' }), /requires declarationMap/u);
		const store = new (mapStore())(value => value);
		assert.throws(() => store.add('/tmp/input.d.ts.map', '{broken'), /Cannot parse declaration map/u);
		assert.throws(() => store.add('/tmp/input.d.ts.map', '{"version":2,"sources":[],"mappings":""}'), /Unsupported declaration map/u);
		assert.throws(() => store.add('/tmp/input.d.ts.map', '{"version":3,"sources":["input.ts"],"mappings":"!"}'), /Invalid base64 VLQ/u);
		assert.throws(() => store.add('/tmp/input.d.ts.map', '{"version":3,"sources":["input.ts"],"mappings":"g"}'), /unterminated base64 VLQ/u);
		assert.throws(() => store.add('/tmp/input.d.ts.map', '{"version":3,"sources":["input.ts"],"mappings":"AA"}'), /Invalid declaration map segment/u);
		assert.throws(() => store.add('/tmp/input.d.ts.map', '{"version":3,"sources":["input.ts"],"mappings":"ACAA"}'), /Invalid declaration map source index/u);
	});

	it('does not assign an origin across an explicit unmapped intermediate segment', () => {
		const store = new (mapStore())(value => value);
		store.add('/tmp/input.d.ts.map', '{"version":3,"sources":["input.ts"],"mappings":"AAAA,K"}');
		assert.strictEqual(store.originalPositionFor('/tmp/input.d.ts', 0, 0)?.line, 0);
		assert.strictEqual(store.originalPositionFor('/tmp/input.d.ts', 0, 5), null);
	});

	it('rejects CLI orphan options and leaves no declaration or map artifact', () => {
		const files = fixture();
		const input = files.file('input.ts', 'export type Public = string;\n');
		const output = path.join(files.directory, 'out.d.ts');
		const cli = path.resolve(__dirname, '../../dist/bin/dts-bundle-generator.js');
		const validOutput = path.join(files.directory, 'valid.d.ts');
		childProcess.execFileSync(process.execPath, [cli, '--project', files.config, '--out-file', validOutput, '--declaration-map', '--silent', input]);
		assert.strictEqual(fs.existsSync(`${validOutput}.map`), true);
		assert.throws(() => childProcess.execFileSync(process.execPath, [cli, '--project', files.config, '--out-file', output, '--declaration-map-inline-sources', input], { stdio: 'pipe' }), /Command failed/u);
		assert.strictEqual(fs.existsSync(output), false);
		assert.strictEqual(fs.existsSync(`${output}.map`), false);
	});

	it('preserves the CLI restriction on one outFile for multiple input entries', () => {
		const files = fixture();
		const first = files.file('first.ts', 'export interface First {}\n');
		const second = files.file('second.ts', 'export interface Second {}\n');
		const output = path.join(files.directory, 'out.d.ts');
		const cli = path.resolve(__dirname, '../../dist/bin/dts-bundle-generator.js');
		childProcess.execFileSync(process.execPath, [cli, '--project', files.config, '--declaration-map', '--silent', first, second]);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'first.d.ts.map')), true);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'second.d.ts.map')), true);
		assert.throws(() => childProcess.execFileSync(process.execPath, [cli, '--out-file', output, '--declaration-map', first, second], { stdio: 'pipe' }), /Command failed/u);
		assert.strictEqual(fs.existsSync(output), false);
		assert.strictEqual(fs.existsSync(`${output}.map`), false);
	});

	it('computes every configured map before writing any entry artifact', () => {
		const files = fixture();
		files.file('first.ts', 'export interface First {}\n');
		files.file('second.ts', 'export interface Second {}\n');
		const validConfig = files.file('bundle.valid.json', JSON.stringify({
			entries: [
				{ filePath: './first.ts', outFile: './good/first.d.ts', output: { declarationMap: true } },
				{ filePath: './second.ts', outFile: './good/second.d.ts', output: { declarationMap: true } },
			],
			compilationOptions: { preferredConfigPath: files.config },
		}));
		const configFile = files.file('bundle.config.json', JSON.stringify({
			entries: [
				{ filePath: './first.ts', outFile: './out/first.d.ts', output: { declarationMap: true } },
				{ filePath: './second.ts', outFile: './out/second.d.ts', output: { declarationMapInlineSources: true } },
			],
			compilationOptions: { preferredConfigPath: files.config },
		}));
		const cli = path.resolve(__dirname, '../../dist/bin/dts-bundle-generator.js');
		childProcess.execFileSync(process.execPath, [cli, '--config', validConfig, '--silent']);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'good/first.d.ts.map')), true);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'good/second.d.ts.map')), true);
		assert.throws(() => childProcess.execFileSync(process.execPath, [cli, '--config', configFile, '--silent'], { stdio: 'pipe' }), /Command failed/u);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'out/first.d.ts')), false);
		assert.strictEqual(fs.existsSync(path.join(files.directory, 'out/first.d.ts.map')), false);
	});

	it('covers minimal declaration-only, no-banner, sourceRoot, and independently configured entries', () => {
		const files = fixture();
		const firstInput = files.file('first.d.mts', 'export interface First {}\n');
		const secondInput = files.file('second.d.cts', 'export interface Second {}\n');
		const outputs = [path.join(files.directory, 'maps/first.d.mts'), path.join(files.directory, 'maps/second.d.cts')];
		const results = generateAll([
			{ filePath: firstInput, output: { declarationMap: true, noBanner: true } },
			{ filePath: secondInput, output: { declarationMap: true, declarationMapInlineSources: true, declarationMapSourceRoot: '..' } },
		], { preferredConfigPath: files.config }, outputs);
		assert.strictEqual(parseMap(results[0].declarationMap).file, 'first.d.mts');
		assert.strictEqual(parseMap(results[1].declarationMap).file, 'second.d.cts');
		assert.strictEqual(parseMap(results[0].declarationMap).sourcesContent, undefined);
		assert.strictEqual(parseMap(results[1].declarationMap).sourcesContent?.length, 1);
		assert.strictEqual(results[0].declarationText.startsWith('// Generated'), false);
	});

	it('emits an empty map rather than assigning synthetic origins for an empty module', () => {
		const files = fixture();
		const input = files.file('empty.ts', 'export {};\n');
		const output = path.join(files.directory, 'empty.d.ts');
		const result = generate(input, files.config, { declarationMap: true, noBanner: true }, output);
		const map = parseMap(result.declarationMap);
		assert.deepStrictEqual(map.sources, []);
		assert.strictEqual(map.mappings, '');
		assert.strictEqual(decodedOrigin(result, output, 'export {}'), null);
	});
});
