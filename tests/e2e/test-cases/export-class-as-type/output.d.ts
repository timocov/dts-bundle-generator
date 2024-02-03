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

declare namespace anotherCustomNs {
	export { AnotherClass, AnotherFoobar };
}

export {
	type AnotherFoobar,
	type anotherCustomNs,
	type ClassToRename as SecondRenamedClass,
	type Enum,
	type Foobar,
	type foobar,
	type funcToRename as renamedType,
	type variable,
};

export {};
