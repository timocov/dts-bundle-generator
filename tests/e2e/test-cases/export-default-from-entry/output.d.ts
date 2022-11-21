export interface MyInterface {
}
export type MyType<T> = {
	[K in keyof T]: string;
};
export default class NewClass implements MyInterface {
}

export {};
