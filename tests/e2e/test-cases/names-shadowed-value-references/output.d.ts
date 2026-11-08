declare const constant$1 = 1;
declare class Base$1 {
	base: number;
}
declare const symbolKey$1: unique symbol;
declare enum Kind$1 {
	A = 1
}
declare function config$1(): void;
export declare namespace constantUsage {
	const constant = "other";
	const usage: typeof constant$1;
}
export declare namespace classHeritage {
	class Base {
		other: string;
	}
	class Derived extends Base$1 {
	}
}
export declare namespace computedKey {
	const symbolKey = "other";
	interface WithKey {
		[symbolKey$1]: number;
	}
}
export declare namespace enumMember {
	const Kind = 1;
	type Usage = Kind$1.A;
}
export declare function withDefaultParameter(config?: typeof config$1): void;

export {};
