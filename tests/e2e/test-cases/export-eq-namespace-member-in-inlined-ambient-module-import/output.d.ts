import { Date as Date$1, Error as AliasedError } from 'package-with-export-eq-namespace';

declare module "ambient-module" {
	import { Date, Error } from "package-with-export-eq-namespace";
	export interface Ambient {
		date: Date;
		error: Error;
	}
}
export type LocalDate = Date$1;
export type LocalError = AliasedError;
export type FromAmbient = import("ambient-module").Ambient;

export {};
