export interface CustomType {
	foo: number;
	bar: string;
}
export namespace Namespace {
	export const baz: number;
}
export interface MyType {
	field: CustomType;
	field2: typeof Namespace;
	field3: import("ora").Options;
}
export declare type MySecondType = MyType | number;

export {};
