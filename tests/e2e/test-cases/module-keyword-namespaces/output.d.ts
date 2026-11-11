declare module "ambient-module" {
	namespace InnerModule {
		interface Inner {
		}
	}
	global {
		interface AmbientModuleGlobal {
		}
	}
}
declare namespace Internal {
	interface Bar {
		field: string;
	}
}
export declare namespace NonExported {
	interface Foo {
		internal: Internal.Bar;
	}
}
export declare namespace ExportedModule {
	interface Foo {
		nonExported: NonExported.Foo;
	}
	/** Nested module JSDoc */
	namespace NestedModule {
		// leading comment
		interface Baz {
		} // trailing comment
		/** detached JSDoc */
	}
	namespace NestedNamespace {
		// leading comment
		interface Qux {
		} // trailing comment
		/** detached JSDoc */
	}
}
export declare namespace Dotted.Inner.Deep {
	type Baz = string;
}
export declare namespace ExistingNamespace {
	type Value = number;
}
declare global {
	interface RootGlobal {
	}
}

export {};
