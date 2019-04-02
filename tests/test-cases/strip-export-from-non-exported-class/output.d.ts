declare class NonExportedClass {
	getThis(): this;
}
export declare class ExportedClass extends NonExportedClass {
}

export {};
