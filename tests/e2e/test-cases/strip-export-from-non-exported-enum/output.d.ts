declare enum NonExportedEnum {
	First = 0
}
export declare const enum NonExportedConstEnum {
	First = 0
}
declare class NonExportedClass {
	method(): NonExportedEnum;
	method2(): NonExportedConstEnum;
}
export declare class ExportedClass extends NonExportedClass {
}

export {};
