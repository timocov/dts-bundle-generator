import { Server } from 'http';
import { NonDefaultInterface, default as _default } from 'package-with-default-export';

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
export * from "fs";

export {
	AnotherInterface as Int2,
	DefaultInterface as DefInterface,
	NonDefaultInterface,
	Server,
	SomeInterface as Int1,
	_default as default,
	constName as cName,
	defaultFunction as defFunction,
	funcName as fName,
	letName as lName,
};

export {};
