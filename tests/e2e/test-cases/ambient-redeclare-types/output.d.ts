interface Type1 {
}
interface Type2 {
}
export declare interface ExportedType {
	Type1: {
		prototype: Type1;
	};
	Type2: {
		prototype: Type2;
	};
}
interface _Type1 extends Type1 {
}
interface _Type2 extends Type2 {
}
export declare namespace ExportedType {
	interface Type1 extends _Type1 {
	}
	interface Type2 extends _Type2 {
	}
}

export {};
