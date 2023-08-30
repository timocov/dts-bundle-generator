import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

import * as ts from 'typescript';

import { generateDtsBundle } from '../../src/bundle-generator';

import { TestCaseConfig } from './test-cases/test-case-config';

interface TestCase {
	name: string;
	inputFileName: string;
	outputFileContent: string;
	config: TestCaseConfig;
}

const testCasesDir = path.resolve(__dirname, 'test-cases');

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const currentPackageVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), { encoding: 'utf-8' })).version as string;

function isDirectory(filePath: string): boolean {
	return fs.lstatSync(path.resolve(testCasesDir, filePath)).isDirectory();
}

function prepareString(str: string): string {
	return str.trim().replace(/\r\n/g, '\n');
}

function findInputFile(testCaseDir: string): string {
	const tsFilePath = path.join(testCaseDir, 'input.ts');
	if (fs.existsSync(tsFilePath)) {
		return tsFilePath;
	}

	const dtsFilePath = path.join(testCaseDir, 'input.d.ts');
	if (fs.existsSync(dtsFilePath)) {
		return dtsFilePath;
	}

	const mtsFilePath = path.join(testCaseDir, 'input.mts');
	if (fs.existsSync(mtsFilePath)) {
		return mtsFilePath;
	}

	const ctsFilePath = path.join(testCaseDir, 'input.cts');
	if (fs.existsSync(ctsFilePath)) {
		return ctsFilePath;
	}

	throw new Error(`Cannot find input file in ${testCaseDir}`);
}

function getTestCases(): TestCase[] {
	return fs.readdirSync(testCasesDir)
		.filter((filePath: string) => {
			return isDirectory(filePath) && path.basename(filePath) !== 'node_modules';
		})
		.map((directoryName: string) => {
			const testCaseDir = path.resolve(testCasesDir, directoryName);

			const inputFileName = findInputFile(testCaseDir);

			const outputFileName = path.resolve(testCaseDir, 'output.d.ts');
			assert(fs.existsSync(outputFileName), `Output file doesn't exist for ${directoryName}`);

			const result: TestCase = {
				name: directoryName,
				inputFileName,
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				config: require(path.resolve(testCaseDir, 'config.ts')) as TestCaseConfig,
				outputFileContent: prepareString(fs.readFileSync(outputFileName, 'utf-8')).replace(/\$PACKAGE_CURRENT_VERSION/g, currentPackageVersion),
			};

			return result;
		});
}

describe(`Functional tests, typescript-v${ts.versionMajorMinor}`, () => {
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
