import { type Diagnostic, type AffectedFileResult as RenamedImport } from 'typescript';

export type MyType = {
	value: Diagnostic;
	alias: RenamedImport<number>;
};

export {};
