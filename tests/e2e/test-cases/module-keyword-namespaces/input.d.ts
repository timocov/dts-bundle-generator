/// <reference path="./ambient-module.d.ts" preserve="true" />

import { Internal } from './internal';

declare module NonExported {
	interface Foo {
		internal: Internal.Bar;
	}
}

export declare module ExportedModule {
	interface Foo {
		nonExported: NonExported.Foo;
	}

	/** Nested module JSDoc */
	module NestedModule {
		// leading comment
		interface Baz {} // trailing comment
		/** detached JSDoc */
	}

	namespace NestedNamespace {
		// leading comment
		interface Qux {} // trailing comment
		/** detached JSDoc */
	}
}

export declare module Dotted.Inner.Deep {
	type Baz = string;
}

export declare namespace ExistingNamespace {
	type Value = number;
}

declare global {
	interface RootGlobal {}
}
