export interface MyInterface {
}
export declare type MyType<T> = {
	[K in keyof T]: string;
};
export default class NewClass implements MyInterface {
}

export {};
