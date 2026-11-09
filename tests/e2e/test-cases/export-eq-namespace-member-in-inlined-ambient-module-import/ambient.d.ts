declare module 'ambient-module' {
	import { Date, Error } from 'package-with-export-eq-namespace';

	export interface Ambient {
		date: Date;
		error: Error;
	}
}
