import { InterfaceWithFields } from 'fake-package';

declare type FakePackageType = InterfaceWithFields | string;
export type TestType = InterfaceWithFields | FakePackageType;

export {};
