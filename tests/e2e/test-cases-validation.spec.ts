import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

const testCasesDir = path.resolve(__dirname, 'test-cases');

function isDirectory(filePath: string): boolean {
	return fs.lstatSync(path.resolve(testCasesDir, filePath)).isDirectory();
}

function findTestCaseFolders(): string[] {
	return fs.readdirSync(testCasesDir)
		.filter((filePath: string) => isDirectory(filePath) && path.basename(filePath) !== 'node_modules')
		.map((directoryName: string) => path.resolve(testCasesDir, directoryName));
}

describe(`e2e test cases validation`, () => {
	for (const testCaseFolder of findTestCaseFolders()) {
		it(path.basename(testCaseFolder), () => {
			const testCaseSpecFilePath = path.join(testCaseFolder, 'index.spec.js');
			assert.strictEqual(fs.existsSync(testCaseSpecFilePath), true, `Spec file '${testCaseSpecFilePath}' should exist`);

			assert.strictEqual(
				fs.readFileSync(testCaseSpecFilePath, { encoding: 'utf-8' }).trim(),
				`require('../run-test-case').runTestCase(__dirname);`,
				'Every test case spec file content should match expected value to run tests'
			);
		});
	}
});
