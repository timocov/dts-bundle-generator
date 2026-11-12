import type { CompilationOptions, EntryPointConfig } from '../../../src/bundle-generator.ts';

export type TestCaseConfig = Pick<EntryPointConfig, 'libraries' | 'failOnClass' | 'output'> & {
	compilationOptions?: Pick<CompilationOptions, 'allowUnresolvedImportTypes'>;
};
