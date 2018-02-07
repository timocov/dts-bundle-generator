export interface MyInterface {}
export type MyType<T> = {
	[K in keyof T]: string;
};

// tslint:disable-next-line
export default class NewClass implements MyInterface {}
