interface Interface {
}
type Type = number | string;
declare namespace ModuleWithoutQuotes {
	export type A = string;
}
interface Base {
	id: string;
}
interface Derived extends Base {
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
export type T = ModuleWithoutQuotes.A;

export {};
