// this case comes from rxjs

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

export const observable = typeof Symbol === 'function' && Symbol.observable || '@@observable';
