import { helper as aliasedHelper } from 'package-with-export-eq-namespace';

export declare const fn: typeof aliasedHelper;
declare module "package-with-export-eq-namespace" {
	function helper(value: string): void;
}

export {};
