export { Interface as Interface2, InterfaceWithFields } from 'fake-package';
import { NonDefaultInterface, NonDefaultInterface as Foo, NonDefaultInterface as Type, NonDefaultInterface as Type2 } from 'package-with-default-export';
export { ReExportedName as NewReExportedName } from 'package-with-re-exports';

type Foo$1 = string;
export type Bar = Foo$1;

export {
	Foo,
	NonDefaultInterface,
	Type,
};

export {};
