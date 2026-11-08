import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import * as ts from 'typescript';

import { generateDtsBundle } from '../../../src/bundle-generator';

import { TestCaseConfig } from './test-case-config';

interface TestCase {
	inputFileName: string;
	outputFileContent: string;
	config: TestCaseConfig;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const currentPackageVersion = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), { encoding: 'utf-8' })).version as string;

const sharedConfigPath = path.resolve(__dirname, 'tsconfig.json');

/**
 * Compiler options as they are written in a tsconfig file (e.g. `"module": "commonjs"`),
 * not the parsed `ts.CompilerOptions` (e.g. `ts.ModuleKind.CommonJS`).
 */
type TsConfigCompilerOptions = Record<string, string | number | boolean>;

/**
 * Returns tsconfig options that should be added on top of a test case's config for the currently installed TypeScript version.
 */
function getVersionSpecificCompilerOptions(): TsConfigCompilerOptions | null {
	const majorVersion = parseInt(ts.versionMajorMinor, 10);

	if (majorVersion >= 6) {
		// `esModuleInterop: false` (used by test cases) is deprecated in TS 6 and requires this option, TS < 6 doesn't accept this value
		return { ignoreDeprecations: '6.0' };
	}

	return null;
}

/**
 * Creates a tsconfig that extends the test case's config (or the shared one) and adds version-specific options.
 * Returns `undefined` if nothing needs to be changed, so the tool will find the test case's config by itself.
 */
function createVersionSpecificConfig(testCaseDir: string): string | undefined {
	const compilerOptions = getVersionSpecificCompilerOptions();
	if (compilerOptions === null) {
		return undefined;
	}

	const testCaseConfigPath = path.join(testCaseDir, 'tsconfig.json');
	const baseConfigPath = fs.existsSync(testCaseConfigPath) ? testCaseConfigPath : sharedConfigPath;

	// the config should be placed next to the test case's one because `types` and other options are resolved relatively to the config's folder
	const generatedConfigPath = path.join(testCaseDir, 'tsconfig.generated.json');
	fs.writeFileSync(generatedConfigPath, JSON.stringify({ extends: baseConfigPath, compilerOptions }, null, 2));

	return generatedConfigPath;
}

function prepareString(str: string): string {
	return str.replace(/\r\n/g, '\n');
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

function getTestCaseConfig(testCaseDir: string): TestCase {
	const inputFileName = findInputFile(testCaseDir);

	const outputFileName = path.resolve(testCaseDir, 'output.d.ts');
	assert(fs.existsSync(outputFileName), `Output file doesn't exist for ${testCaseDir}`);

	return {
		inputFileName,
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		config: require(path.resolve(testCaseDir, 'config.ts')) as TestCaseConfig,
		outputFileContent: prepareString(fs.readFileSync(outputFileName, 'utf-8')).replace(/\$PACKAGE_CURRENT_VERSION/g, currentPackageVersion),
	};
}

export function runTestCase(testCaseDirPath: string): void {
	const testCaseName = path.basename(testCaseDirPath);

	describe('e2e |', () => {
		let preferredConfigPath: string | undefined;

		before(() => {
			preferredConfigPath = createVersionSpecificConfig(testCaseDirPath);
		});

		after(() => {
			if (preferredConfigPath !== undefined) {
				fs.unlinkSync(preferredConfigPath);
			}
		});

		it(testCaseName, () => {
			const testCase = getTestCaseConfig(testCaseDirPath);

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
				],
				{ preferredConfigPath }
			)[0];
			const result = prepareString(dtsResult);
			assert.strictEqual(result, testCase.outputFileContent, 'Output should be the same as expected');
		});
	});
}
