declare namespace MyModule {
	export interface SomeCoolInterface {
		field: string;
		field2: number;
	}
}
interface LibInterface$1 {
	field: number;
}
export const myLib: LibInterface$1;

export {
	MyModule as newName,
};

export {};
