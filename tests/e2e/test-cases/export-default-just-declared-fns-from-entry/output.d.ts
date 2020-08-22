declare function name(a: number): number;
declare function fooBar(): void;

export {
	fooBar as fooBaz,
	name as fns,
};

export {};
