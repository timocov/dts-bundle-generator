declare function getRandom(): number;
interface SomeInterface {
  field: typeof getRandom;
}
export declare function justFunction(input: boolean): void;
export interface SomeInterface {
  field2: typeof justFunction;
}

export default SomeInterface;

export {};
