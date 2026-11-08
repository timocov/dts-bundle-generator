interface Interface {
}
type Decl = string;
export interface ExportedInterface extends Interface {
	foo: Decl;
}

export {};
