declare function original$1(): void;
declare function aliased$1(): void;
declare function viaNs$1(): void;
declare function defaultFn$1(): void;
declare function inFirstBlock$1(): void;
declare function inner$1(): void;
declare function param$1(): void;
interface Target$1 {
	field: number;
}
export declare function expando(): void;
export declare namespace expando {
	var defaultFn: typeof defaultFn$1;
	var original: typeof original$1;
	var viaNs: typeof viaNs$1;
}
export declare namespace explicit {
	const aliased: typeof aliased$1;
}
export declare namespace merged {
	const inFirstBlock = 2;
}
export declare namespace merged {
	const usage: typeof inFirstBlock$1;
}
export declare namespace Dotted.inner {
	const usage: typeof inner$1;
}
export type WithTypeParameter<Target> = Target$1 | Target;
export declare function withParameter(param: typeof param$1): void;

export {};
