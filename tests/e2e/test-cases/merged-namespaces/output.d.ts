export type FooBar = string;
declare namespace Ns1 {
	namespace SubNs1 {
		interface Interface1 {
			field1: FooBar;
		}
	}
}
declare namespace Ns1 {
	namespace SubNs1 {
		interface Interface2 {
			field1: FooBar;
		}
	}
}
declare namespace Ns2 {
	namespace SubNs1 {
		interface Interface1 {
			field1: Ns1.SubNs1.Interface1;
		}
	}
}
declare namespace Ns2 {
	namespace SubNs1 {
		interface Interface2 {
			field1: Ns1.SubNs1.Interface2;
		}
	}
}
export type FooBar$1 = number;
declare namespace Ns1$1 {
	namespace SubNs1 {
		interface Interface1 {
			field1: FooBar$1;
		}
	}
}
declare namespace Ns1$1 {
	namespace SubNs1 {
		interface Interface2 {
			field1: FooBar$1;
		}
	}
}
declare namespace Ns2$1 {
	namespace SubNs1 {
		interface Interface1 {
			field1: Ns1$1.SubNs1.Interface1;
		}
	}
}
declare namespace Ns2$1 {
	namespace SubNs1 {
		interface Interface2 {
			field1: Ns1$1.SubNs1.Interface2;
		}
	}
}
export interface Int {
	f1: Ns1.SubNs1.Interface1;
	f2: Ns1$1.SubNs1.Interface1;
}

export {
	Ns1 as F1Ns1,
	Ns1$1 as F2Ns1,
	Ns2 as F1Ns2,
	Ns2$1 as F2Ns2,
};

export {};
