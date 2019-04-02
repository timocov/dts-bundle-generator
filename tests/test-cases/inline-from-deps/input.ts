import { Interface, Type } from 'fake-package';
import { SomeClass } from 'fake-package/some-class';

export type TestType = Interface | Type;
export class MyClass extends SomeClass {}
