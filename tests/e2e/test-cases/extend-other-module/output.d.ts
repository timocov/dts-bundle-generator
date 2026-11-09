declare function getRandom(): number;
interface SomeInterface {
	field: typeof getRandom;
}
export declare function justFunction(input: SomeInterface): void;
interface SomeInterface {
	field2: typeof justFunction;
}
interface SomeInterface {
	field3: typeof justFunction;
}

export {};
