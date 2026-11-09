export interface ReferencedInterface {
	field: NestedInterface;
}
export interface NestedInterface {
}
export type ReferencedType = string | number;
export declare const enum ReferencedConstEnum {
	Item = 0
}
declare class ReferencedClass {
}
export declare function func(a: ReferencedInterface, b: ReferencedType, c: ReferencedClass): ReferencedConstEnum;

export {};
