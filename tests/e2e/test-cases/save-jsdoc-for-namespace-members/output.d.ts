/**
 * functionMember JSDoc from imported namespace (renamed because of the collision)
 */
declare function functionMember(): void;
interface NotMember {
}
/**
 * InterfaceMember JSDoc
 */
interface InterfaceMember {
	field: NotMember;
}
/**
 * TypeMember JSDoc
 */
type TypeMember = string;
/**
 * constMember JSDoc
 */
declare const constMember: number;
/**
 * firstVariable and secondVariable JSDoc
 */
declare const firstVariable: number, secondVariable: number;
/**
 * functionMember JSDoc
 */
declare function functionMember$1(): void;
/**
 * ClassMember JSDoc
 */
declare class ClassMember {
}
/**
 * EnumMember JSDoc
 */
declare enum EnumMember {
	Item = 0
}
/**
 * default member JSDoc
 */
declare function defaultMember(): void;

declare namespace exportedNamespace {
	export { ClassMember, EnumMember, InterfaceMember, TypeMember, constMember, defaultMember as default, firstVariable, functionMember$1 as functionMember, secondVariable };
}
declare namespace importedNamespace {
	export { functionMember };
}

export {
	exportedNamespace,
	importedNamespace,
};

export {};
