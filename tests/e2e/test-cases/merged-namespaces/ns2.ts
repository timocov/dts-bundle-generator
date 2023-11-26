export type FooBar = number;

export namespace Ns1 {
	export namespace SubNs1 {
		export interface Interface1 {
			field1: FooBar;
		}
	}
}

export namespace Ns1 {
	export namespace SubNs1 {
		export interface Interface2 {
			field1: FooBar;
		}
	}
}

export module Ns2 {
	export module SubNs1 {
		export interface Interface1 {
			field1: Ns1.SubNs1.Interface1;
		}
	}
}

export module Ns2 {
	export module SubNs1 {
		export interface Interface2 {
			field1: Ns1.SubNs1.Interface2;
		}
	}
}
