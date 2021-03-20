export function justFunction2(): void;

declare module '..\\extendable-module' {
	interface SomeInterface {
		field3: typeof justFunction2;
	}
}
