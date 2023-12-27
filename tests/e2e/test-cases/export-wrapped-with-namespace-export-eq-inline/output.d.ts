declare namespace MyModule {
	export interface SomeCoolInterface {
		field: string;
		field2: number;
	}
}
interface ExportedInterface {
	field: number;
}
export const myLib: ExportedInterface;

export {
	MyModule as newName,
};

export {};
