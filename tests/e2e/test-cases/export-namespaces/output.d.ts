declare namespace InternalNamespace {
	type NSType = string;
}
declare module InternalModule {
	type MType = number;
}
export declare namespace ExportedNamespace {
	type ENSType = 1 | 2;
}
export declare module ExportedModule {
	type EMType = 3 | 4;
}
export type A = InternalModule.MType;
export type B = InternalNamespace.NSType;

export {};
