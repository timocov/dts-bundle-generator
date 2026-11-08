import { CompilationOptions, EntryPointConfig } from '../../../src/bundle-generator';

export type TestCaseConfig = Pick<EntryPointConfig, 'libraries' | 'failOnClass' | 'output'> & {
	compilationOptions?: Pick<CompilationOptions, 'allowUnresolvedImportTypes'>;
};
