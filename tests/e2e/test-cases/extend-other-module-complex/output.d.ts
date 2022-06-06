declare function justFunction(input: boolean): void;
interface SomeInterface {
	field2: typeof justFunction;
}
declare function justFunction2(): void;
interface SomeInterface {
	field3: typeof justFunction2;
}
declare function getRandom(): number;
interface SomeInterface {
	field: typeof getRandom;
}

export {
	SomeInterface as default,
};

export {};
