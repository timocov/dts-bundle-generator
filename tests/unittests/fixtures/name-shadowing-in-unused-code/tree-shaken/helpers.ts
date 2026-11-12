export function used(): void {}

export namespace notUsed {
	export type Target = number;
	export type Usage = import('./types').Target;
}
