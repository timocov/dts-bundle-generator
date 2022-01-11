export interface SomeInterface {
	field: string;
}
interface AnotherInterface {
	field: number;
}
interface DefaultInterface {
	field: boolean;
}
declare let letName: number;
declare const constName = "const";
declare function funcName(): void;
declare function defaultFunction(): void;
export declare class MyClass {
}
export { Server } from "http";
export * from "fs";
export { default } from "package-with-default-export";

export {
	AnotherInterface as Int2,
	DefaultInterface as DefInterface,
	SomeInterface as Int1,
	constName as cName,
	defaultFunction as defFunction,
	funcName as fName,
	letName as lName,
};

export {};
