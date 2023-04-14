import { Interface, Type, ModuleWithoutQuotes } from 'fake-package';
import { Derived } from 'fake-types-lib-2';
import { SomeClass } from 'fake-package/some-class';

export type TestType = Interface | Type;
export class MyClass extends SomeClass {}
export type ReExportedTypes = Derived;
export type T = ModuleWithoutQuotes.A;
