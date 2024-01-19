declare function foobar(): void;
declare function funcToRename(): void;
declare class Foobar {
}
declare class ClassToRename {
}
declare const variable = 123;
declare class AnotherFoobar {
}
declare class AnotherClass {
}
export type SomeCoolType = AnotherClass;
declare enum Enum {
}

export {
	type AnotherFoobar,
	type ClassToRename as SecondRenamedClass,
	type Enum,
	type Foobar,
	type foobar,
	type funcToRename as renamedType,
	type variable,
};

export {};
