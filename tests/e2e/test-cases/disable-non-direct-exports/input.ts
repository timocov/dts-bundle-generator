import {
	Class,
	ConstEnum,
	Enum,
	func,
	Interface,
	Type,
	variable,
} from './module';

export interface ExportedInterface {
	class: Class;
	constEnum: ConstEnum;
	enum: Enum;
	func: typeof func;
	interface: Interface;
	type: Type;
	variable: typeof variable;
}
