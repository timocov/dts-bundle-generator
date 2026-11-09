import { Inner } from 'package-with-export-eq-namespace';

export declare namespace Ns {
	import Alias = Inner;
	type Entry = Alias.Entry;
}

export {};
