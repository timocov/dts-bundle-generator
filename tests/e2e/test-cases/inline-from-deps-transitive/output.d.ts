import { Path } from 'fake-path';
import { InterfaceFromTypesPackage } from 'fake-types-lib';

export interface File {
	path: Path;
}
export interface Interface {
}
export interface InterfaceWithFields {
	field: Type;
	field2: Interface;
	field3: InterfaceFromTypesPackage;
}
export type Type = number | string;

export {};
