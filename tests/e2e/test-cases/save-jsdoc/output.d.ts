declare enum NonExportedEnum {
	First = 0
}
/**
 * NonExportedConstEnum JSDoc
 */
export declare const enum NonExportedConstEnum {
	First = 0
}
declare class NonExportedClass {
	method(): NonExportedEnum;
	method2(): NonExportedConstEnum;
}
/**
 * ExportedInterface JSDoc
 */
export interface ExportedInterface {
}
/**
 * ExportedType JSDoc
 */
export declare type ExportedType = string | number;
/**
 * ExportedConstEnum JSDoc
 */
export declare const enum ExportedConstEnum {
	Item = 0
}
/**
 * ExportedEnum JSDoc
 */
export declare enum ExportedEnum {
	Item = 0
}
/**
 * const JSDoc
 */
export declare const constItem = 1;
/**
 * ExportedClass JSDoc
 */
export declare class ExportedClass extends NonExportedClass {
}

export {};
