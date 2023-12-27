import { InterfaceName, TypeName, func2 } from './func';

export function func({ prop }: InterfaceName = { prop: 1, prop2: 1 }): TypeName {
	throw new Error('it does not matter' + prop);
}

export { func2 };
