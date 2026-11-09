import { Application, Date as Date$1, Error as RegExp$1, Map as Map$1, Promise as AliasedPromise } from 'package-with-export-eq-namespace';

export declare function handle(app: Application, date: Date$1, promise: AliasedPromise): void;
export interface Options {
	date: Date$1;
	promise: AliasedPromise;
	aliasCollidingWithGlobal: RegExp$1;
	qualifiedName: Map$1.Entry;
	globalDate: globalThis.Date;
}

export {};
