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
export type TestType = Interface | Type;
export declare class MyClass extends SomeClass {
}
export type ReExportedTypes = Derived;

export {};
