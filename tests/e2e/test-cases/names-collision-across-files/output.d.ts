import { Interface as FPI1, Interface as FPI2, Interface as Interface$2 } from 'fake-package';

export type ExportEqNs = string;
declare namespace ExportEqNs$1 {
	namespace InternalNs {
		type NewType = string;
	}
	type Bar = ExportEqNs$1.Foo;
	type Foo = String;
	namespace InternalNs2 {
		type Type21 = InternalNs3.Type31;
		type Type22 = InternalNs2.InternalNs3.Type31;
		type Type23 = ExportEqNs$1.InternalNs2.InternalNs3.Type31;
		namespace InternalNs3 {
			type Type31 = InternalNs4.Type;
			type Type32 = InternalNs3.InternalNs4.Type;
			type Type33 = InternalNs2.InternalNs3.InternalNs4.Type;
			type Type34 = ExportEqNs$1.InternalNs2.InternalNs3.InternalNs4.Type;
			namespace InternalNs4 {
				type Type = string;
			}
		}
	}
}
declare const TEMPLATE = "template1";
declare const MergedSymbol = "";
declare var Variable: number;
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
declare var Variable$1: string;
interface MergedSymbol$1 {
	test(): void;
}
interface Interface$1 {
	field2: number;
}
declare function func$1(two: number): void;
type TypeName$1 = Pick<Interface$1, "field2">;
/** Another interface doc string */
interface AnotherInterface$1 {
	field2: number;
}
/** Another func doc string */
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
	field5: FPI1;
	field6: FPI1;
	field7: Interface$2;
}
export interface DefaultInterface {
	field10: number;
}
export interface Inter2 {
	field: Interface;
	field2: AnotherInterface$1;
	field3: TypeName;
	field4: AnotherInterface;
	field5: FPI1;
	field6: FPI2;
	field7: Interface$2;
	field8: DefaultInterface;
}
export type MyType = Interface$2;
export type ExportedNsType = ExportEqNs$1.InternalNs.NewType;

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
	Variable as V1,
	Variable$1 as V2,
	anotherFunc as af1,
	anotherFunc$1 as anotherFunc,
	func as f1,
	func$1 as f2,
};

export {};
