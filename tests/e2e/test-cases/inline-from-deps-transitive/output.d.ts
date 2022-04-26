import { Path } from 'fake-path';
import { InterfaceFromTypesPackage } from 'fake-types-lib';

export interface Interface {
}
export type Type = number | string;
export interface InterfaceWithFields {
	field: Type;
	field2: Interface;
	field3: InterfaceFromTypesPackage;
}
export interface File {
	path: Path;
}

export {};
