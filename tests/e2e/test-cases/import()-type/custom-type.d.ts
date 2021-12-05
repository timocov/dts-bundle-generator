export interface CustomType {
	foo: number;
	bar: string;
}

export namespace Namespace {
	export const baz: number;
}

export declare type GenericType<T, U> = {};
