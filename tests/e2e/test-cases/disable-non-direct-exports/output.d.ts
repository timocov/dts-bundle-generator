declare class Class {
}
declare const enum ConstEnum {
}
declare const variable: string;
declare enum Enum {
}
declare function func(): void;
interface Interface {
}
type Type = string;
declare const enum ConstEnum2 {
}
declare enum Enum2 {
}
export interface ExportedInterface {
	class: Class;
	constEnum: ConstEnum;
	constEnum2: ConstEnum2;
	enum: Enum;
	enum2: Enum2;
	func: typeof func;
	interface: Interface;
	type: Type;
	variable: typeof variable;
}

export {};
