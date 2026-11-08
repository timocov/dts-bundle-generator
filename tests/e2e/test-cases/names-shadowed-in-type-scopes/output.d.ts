declare function param$1(): void;
interface Target$1 {
	field: number;
}
declare namespace inner$1 {
	interface Deep {
		d: 1;
	}
}
export type Mapped = {
	[Target in "a"]: Target$1 | Target;
};
export type Inferred<T> = T extends (infer Target)[] ? [
	Target,
	Target$1
] : never;
export interface WithInterfaceParameter<Target> {
	a: Target$1;
	b: Target;
}
export declare class WithClassParameter<Target> {
	method(a: Target$1): Target;
}
export declare function withCallback(callback: (param: typeof param$1) => void): void;
export declare class WithMethod {
	method(param: typeof param$1): void;
}
export declare namespace firstQualifierPart {
	namespace inner {
		type Other = 1;
	}
	type Usage = inner$1.Deep;
}
export declare function withFunctionTypeParameter<Target>(a: Target$1): Target;
export declare class WithMethodTypeParameter {
	method<Target>(a: Target$1): Target;
}

export {};
