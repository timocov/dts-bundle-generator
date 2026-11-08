import { ReferencedInterface, ReferencedType, ReferencedConstEnum, ReferencedClass } from './referenced';

export function func(a: ReferencedInterface, b: ReferencedType, c: ReferencedClass): ReferencedConstEnum {
	return ReferencedConstEnum.Item;
}
