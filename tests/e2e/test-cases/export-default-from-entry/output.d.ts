export interface MyInterface {
}
export type MyType<T> = {
	[K in keyof T]: string;
};
declare class NewClass implements MyInterface {
}

export {
	NewClass as default,
};

export {};
