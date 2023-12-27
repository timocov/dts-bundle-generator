declare namespace MyModule {
	export interface SomeCoolInterface {
		field: string;
		field2: number;
	}
}
interface LibInterface {
	field: number;
}
export const myLib: LibInterface;

export {
	MyModule as newName,
};

export {};
