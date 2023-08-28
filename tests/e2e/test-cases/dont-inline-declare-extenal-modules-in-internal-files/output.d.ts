export interface Interface {
	field: Interface;
}
export interface InterfaceInternal extends Interface {
}
export declare namespace ModuleName {
	interface Interface extends InterfaceInternal {
	}
}
export declare var ModuleName: {
	prototype: Interface;
};

export {};
