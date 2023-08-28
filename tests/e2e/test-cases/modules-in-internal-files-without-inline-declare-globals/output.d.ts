export interface Interface {
	field: Interface;
}
declare namespace ExportedModule {
	type Foo = string;
}
export interface InterfaceInternal extends Interface {
}
export declare namespace ModuleName {
	interface Interface extends InterfaceInternal {
	}
	type Bar = ExportedModule.Foo;
}
export declare var ModuleName: {
	prototype: Interface;
};

export {};
