export type TypeName = string | number;

export interface InterfaceName {
	prop: number;
	prop2: TypeName;
}

export function func({ prop: prop3 }: InterfaceName = { prop: 1, prop2: 1 }): TypeName {
	throw new Error('it does not matter' + prop3);
}
