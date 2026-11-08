export interface ReferencedInterface {
	field: NestedInterface;
}

export interface NestedInterface {}

export type ReferencedType = string | number;

export const enum ReferencedConstEnum {
	Item,
}

// classes are never exported implicitly
export class ReferencedClass {}
