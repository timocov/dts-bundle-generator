export type Mapped = { [Target in 'a']: import('./others').Target | Target };

export type Inferred<T> = T extends (infer Target)[] ? [Target, import('./others').Target] : never;

export interface WithInterfaceParameter<Target> {
	a: import('./others').Target;
	b: Target;
}

export declare class WithClassParameter<Target> {
	method(a: import('./others').Target): Target;
}

export declare function withCallback(callback: (param: typeof import('./others').param) => void): void;

export declare class WithMethod {
	method(param: typeof import('./others').param): void;
}

export namespace firstQualifierPart {
	export namespace inner {
		export type Other = 1;
	}

	export type Usage = import('./others').inner.Deep;
}

export declare function withFunctionTypeParameter<Target>(a: import('./others').Target): Target;

export declare class WithMethodTypeParameter {
	method<Target>(a: import('./others').Target): Target;
}
