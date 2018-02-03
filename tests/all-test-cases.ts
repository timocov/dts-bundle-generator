/// <reference types="jasmine"/>

import * as fs from 'fs';
import * as path from 'path';

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

function getTestCases(): TestCase[] {
	return fs.readdirSync(testCasesDir)
		.filter(isDirectory)
		.map((directoryName: string) => {
			const testCaseDir = path.resolve(testCasesDir, directoryName);
			const outputFileName = path.resolve(testCaseDir, 'output.d.ts');

			const result: TestCase = {
				name: directoryName,
				inputFileName: path.resolve(testCaseDir, 'input.ts'),
				config: require(path.resolve(testCaseDir, 'config.js')) as TestCaseConfig,
				outputFileContent: fs.readFileSync(outputFileName, 'utf-8').trim(),
			};

			return result;
		});
}

for (const testCase of getTestCases()) {
	it(testCase.name, () => {
		const result = generateDtsBundle(testCase.inputFileName, testCase.config.generatorOptions).trim();
		expect(result).toEqual(testCase.outputFileContent, 'Output should be the same as expected');
	});
}
