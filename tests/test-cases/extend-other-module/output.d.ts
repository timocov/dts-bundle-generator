export declare function getRandom(): number;
export interface SomeInterface {
	field: typeof getRandom;
}
export declare function justFunction(input: SomeInterface): void;
export interface SomeInterface {
		field2: typeof justFunction;
	}
