declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}
export declare const observable: string | typeof Symbol.observable;

export {};
