import * as Ns from 'fake-package';

declare namespace MyModule {
	export interface SomeCoolInterface {
		field: string;
		field2: number;
	}
}
type A = string;

declare namespace FirstNamespaceName {
	export { A, MyModule as Ns1, Ns };
}
declare namespace TopNamespaceName {
	export { FirstNamespaceName };
}

export {
	TopNamespaceName,
};

export {};
