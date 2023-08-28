declare namespace InternalNamespace {
	type NSType = string;
}
declare namespace InternalModule {
	type MType = number;
}
export declare namespace ExportedNamespace {
	type ENSType = 1 | 2;
}
export declare namespace ExportedModule {
	type EMType = 3 | 4;
}
export type A = InternalModule.MType;
export type B = InternalNamespace.NSType;

export {};
