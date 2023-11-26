const TEMPLATE = 'template2';
export default TEMPLATE;

export const MergedSymbol = '';
export interface MergedSymbol {
	test(): void
};

export interface Interface {
	field2: number;
}

export function func(two: number) {}

export type TypeName = Pick<Interface, 'field2'>;

export interface AnotherInterface {
	field2: number;
}

export function anotherFunc(two: NamespaceName.Local) {}

export namespace NamespaceName {
	export interface Local {}
}
