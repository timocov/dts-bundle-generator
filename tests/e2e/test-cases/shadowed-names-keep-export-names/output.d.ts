declare function fn$1(): void;
interface Target$1 {
	field: number;
}
export declare function expando(): void;
export declare namespace expando {
	var fn: typeof fn$1;
}
export type WithTypeParameter<Target> = Target$1 | Target;

export {
	Target$1 as Target,
	fn$1 as default,
	fn$1 as fn,
};

export {};
