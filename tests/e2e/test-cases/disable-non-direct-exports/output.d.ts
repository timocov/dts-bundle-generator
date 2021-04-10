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
declare type Type = string;
export interface ExportedInterface {
	class: Class;
	constEnum: ConstEnum;
	enum: Enum;
	func: typeof func;
	interface: Interface;
	type: Type;
	variable: typeof variable;
}

export {};
