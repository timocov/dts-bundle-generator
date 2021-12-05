export interface CustomType {
	foo: number;
	bar: string;
}
export namespace Namespace {
	export const baz: number;
}
export declare type GenericType<T, U> = {};
export interface MyType {
	field: CustomType;
	field2: typeof Namespace;
	field3: import("ora").Options;
	field4: GenericType<number, string>;
}
export declare type MySecondType = MyType | number;

export {};
