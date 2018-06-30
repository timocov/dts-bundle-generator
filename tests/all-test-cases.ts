/// <reference types="jasmine"/>

import * as fs from 'fs';
import * as path from 'path';

import { enableErrorsOnly } from '../src/logger';
import { generateDtsBundle } from '../src/bundle-generator';

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

			const result: TestCase = {
				name: directoryName,
				inputFileName: path.relative(process.cwd(), path.resolve(testCaseDir, 'input.ts')),
				config: require(path.resolve(testCaseDir, 'config.js')) as TestCaseConfig,
				outputFileContent: prepareString(fs.readFileSync(outputFileName, 'utf-8')),
			};

			return result;
		});
}

enableErrorsOnly();

for (const testCase of getTestCases()) {
	it(testCase.name, () => {
		const result = prepareString(generateDtsBundle(testCase.inputFileName, testCase.config.generatorOptions));
		expect(result).toEqual(testCase.outputFileContent, 'Output should be the same as expected');
	});
}
