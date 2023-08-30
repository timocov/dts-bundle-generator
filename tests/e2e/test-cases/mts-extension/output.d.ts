export interface Interface {
}
export type Decl = string;
export interface ExportedInterface extends Interface {
	foo: Decl;
}

export {};
