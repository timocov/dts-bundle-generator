import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

import { generateDtsBundle } from '../../src/bundle-generator';

import { TestCaseConfig } from './test-cases/test-case-config';

interface TestCase {
	name: string;
	inputFileName: string;
	outputFileContent: string;
	config: TestCaseConfig;
}

const testCasesDir = path.resolve(__dirname, 'test-cases');

function isDirectory(filePath: string): boolean {
	return fs.lstatSync(path.resolve(testCasesDir, filePath)).isDirectory();
}

function prepareString(str: string): string {
	return str.trim().replace(/\r\n/g, '\n');
}

function getTestCases(): TestCase[] {
	return fs.readdirSync(testCasesDir)
		.filter((filePath: string) => {
			return isDirectory(filePath) && path.basename(filePath) !== 'node_modules';
		})
		.map((directoryName: string) => {
			const testCaseDir = path.resolve(testCasesDir, directoryName);
			const outputFileName = path.resolve(testCaseDir, 'output.d.ts');

			const tsFilePath = path.relative(process.cwd(), path.resolve(testCaseDir, 'input.ts'));
			const dtsFilePath = path.relative(process.cwd(), path.resolve(testCaseDir, 'input.d.ts'));

			const inputFileName = fs.existsSync(tsFilePath) ? tsFilePath : dtsFilePath;

			assert(fs.existsSync(inputFileName), `Input file doesn't exist for ${directoryName}`);
			assert(fs.existsSync(outputFileName), `Output file doesn't exist for ${directoryName}`);

			const result: TestCase = {
				name: directoryName,
				inputFileName,
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				config: require(path.resolve(testCaseDir, 'config.ts')) as TestCaseConfig,
				outputFileContent: prepareString(fs.readFileSync(outputFileName, 'utf-8')),
			};

			return result;
		});
}

describe('Functional tests', () => {
	for (const testCase of getTestCases()) {
		it(testCase.name, () => {
			const outputOptions = testCase.config.output || {};
			if (outputOptions.noBanner === undefined) {
				// hide banner by default for all tests except these who set it explicitly
				outputOptions.noBanner = true;
			}

			const dtsResult = generateDtsBundle(
				[
					{
						...testCase.config,
						output: outputOptions,
						filePath: testCase.inputFileName,
					},
				]
			)[0];
			const result = prepareString(dtsResult);
			assert.strictEqual(result, testCase.outputFileContent, 'Output should be the same as expected');
		});
	}
});
