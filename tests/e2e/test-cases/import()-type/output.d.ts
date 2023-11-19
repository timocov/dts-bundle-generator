export interface CustomType {
	foo: number;
	bar: string;
}
declare namespace Namespace {
	export const baz: number;
}
export declare type GenericType<T, U> = {};
export interface Interface {
}
declare namespace Namespace$1 {
	export const baz: number;
}
export interface MyType {
	field: CustomType;
	field2: typeof Namespace;
	field3: import("ora").Options;
	field4: GenericType<number, string>;
	field5: Interface;
	field6: typeof Namespace$1;
}
export type MySecondType = MyType | number;

export {};
