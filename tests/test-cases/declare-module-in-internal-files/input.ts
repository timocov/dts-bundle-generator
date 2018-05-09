// this test case comes from Dexie.js

import { Interface } from './interface';

export interface InterfaceInternal extends Interface {}

declare module ModuleName {
	export interface Interface extends InterfaceInternal {}
}

declare var ModuleName: { prototype: Interface };

export { ModuleName };
