const TEMPLATE = 'template2';
export default TEMPLATE;

export const MergedSymbol = '';

export var Variable = '';

export interface MergedSymbol {
	test(): void
};

export interface Interface {
	field2: number;
}

export function func(two: number) {}

export type TypeName = Pick<Interface, 'field2'>;

/** Another interface doc string */
export interface AnotherInterface {
	field2: number;
}

/** Another func doc string */
export function anotherFunc(two: NamespaceName.Local) {}

export namespace NamespaceName {
	export interface Local {}
}

export interface ExportedButNotUsedInterface {}
