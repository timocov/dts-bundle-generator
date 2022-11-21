export type TypeName = string | number;
export interface InterfaceName {
	prop: number;
	prop2: TypeName;
}
export declare function func({ prop: prop3 }?: InterfaceName): TypeName;

export {};
