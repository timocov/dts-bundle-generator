import * as fakePackage from 'fake-package';
import { Interface as FPI1, Interface as FPI2, Interface as Interface$2 } from 'fake-package';

declare const TEMPLATE = "template1";
declare const MergedSymbol = "";
interface MergedSymbol {
	test(): void;
}
interface Interface {
	field1: number;
}
declare function func(one: number): void;
type TypeName = Pick<Interface, "field1">;
interface AnotherInterface {
	field1: number;
}
declare function anotherFunc(one: NamespaceName.Local): void;
declare namespace NamespaceName {
	interface Local {
	}
}
declare const TEMPLATE$1 = "template2";
declare const MergedSymbol$1 = "";
interface MergedSymbol$1 {
	test(): void;
}
interface Interface$1 {
	field2: number;
}
declare function func$1(two: number): void;
type TypeName$1 = Pick<Interface$1, "field2">;
interface AnotherInterface$1 {
	field2: number;
}
declare function anotherFunc$1(two: NamespaceName$1.Local): void;
declare namespace NamespaceName$1 {
	interface Local {
	}
}
export interface Inter {
	field: Interface;
	field2: AnotherInterface$1;
	field3: TypeName;
	field4: AnotherInterface;
	field5: fakePackage.Interface;
	field6: FPI1;
	field7: Interface$2;
}
export interface Inter2 {
	field: Interface;
	field2: AnotherInterface$1;
	field3: TypeName;
	field4: AnotherInterface;
	field5: fakePackage.Interface;
	field6: FPI2;
	field7: Interface$2;
}
export type MyType = Interface$2;

export {
	AnotherInterface as AI1,
	AnotherInterface$1 as AnotherInterface,
	Interface as I1,
	Interface$1 as I2,
	MergedSymbol as MS1,
	MergedSymbol$1 as MS2,
	NamespaceName as NS1,
	NamespaceName$1 as NS2,
	TEMPLATE as TEMPLATE1,
	TEMPLATE$1 as TEMPLATE2,
	TypeName as T1,
	TypeName$1 as T2,
	anotherFunc as af1,
	anotherFunc$1 as anotherFunc,
	func as f1,
	func$1 as f2,
};

export {};
