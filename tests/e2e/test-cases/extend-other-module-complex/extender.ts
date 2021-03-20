export function justFunction(input: boolean): void {
	// do nothing
}

declare module './extendable-module' {
	interface SomeInterface {
		field2: typeof justFunction;
	}
}
