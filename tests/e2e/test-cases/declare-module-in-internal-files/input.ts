// this test case comes from Dexie.js

/// <reference path="./ambient-module-declaration.d.ts" />

import { ModuleWithoutQuotes } from 'fake-package';

import { Interface, ExportedModule } from './interface';

export interface InterfaceInternal extends Interface {}

declare module ModuleName {
	export interface Interface extends InterfaceInternal {}
	export type Bar = ExportedModule.Foo;
	export type Foo = ModuleWithoutQuotes.A;
}

declare var ModuleName: { prototype: Interface };

export { ModuleName };
