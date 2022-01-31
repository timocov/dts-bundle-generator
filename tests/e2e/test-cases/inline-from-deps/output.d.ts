export interface Interface {
}
export type Type = number | string;
export interface Base {
	id: string;
}
export interface Derived extends Base {
	name: string;
}
declare class SomeClass {
	private x;
	public constructor();
}
export declare type TestType = Interface | Type;
export declare class MyClass extends SomeClass {
}
export declare type ReExportedTypes = Derived;

export {};
