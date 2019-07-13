// this case comes from rxjs

declare global {
	interface SymbolConstructor {
		observable: symbol;
	}
}

export const observable = typeof Symbol === 'function' && Symbol.observable || '@@observable';
