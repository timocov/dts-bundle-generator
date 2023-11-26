const TEMPLATE = 'template1';
export default TEMPLATE;

export const MergedSymbol = '';
export interface MergedSymbol {
	test(): void
};

export interface Interface {
	field1: number;
}

export function func(one: number) {}

export type TypeName = Pick<Interface, 'field1'>;

export interface AnotherInterface {
	field1: number;
}

export function anotherFunc(one: NamespaceName.Local) {}

export namespace NamespaceName {
	export interface Local {}
}
