import type { Application, Date, Map, Promise as AliasedPromise, Error as RegExp } from 'package-with-export-eq-namespace';

export declare function handle(app: Application, date: Date, promise: AliasedPromise): void;

export interface Options {
	date: Date;
	promise: AliasedPromise;
	aliasCollidingWithGlobal: RegExp;
	qualifiedName: Map.Entry;
	globalDate: globalThis.Date;
}
