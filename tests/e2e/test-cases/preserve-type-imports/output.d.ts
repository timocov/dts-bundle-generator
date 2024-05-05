import { type AffectedFileResult as RenamedImport, type Diagnostic } from 'typescript';

export type MyType = {
	value: Diagnostic;
	alias: RenamedImport<number>;
};

export {};
