export declare const enum NonDirectlyExportedConstEnum {
	FooBar = 0
}
export declare enum DirectlyReExportedConstEnum {
	BarFoo = 0
}
export declare enum DirectlyExportedConstEnum {
	FirstItem = "const enum",
	SecondItem = 1
}
export declare const foo = NonDirectlyExportedConstEnum.FooBar;

export {};
