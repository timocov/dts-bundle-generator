declare function fn$2(): void;
declare function fn$3(): void;
export declare namespace namespaceWithSuffix {
	const fn = 1;
	const fn$1 = 2;
	const usage: typeof fn$2;
	const otherUsage: typeof fn$3;
}

export {
	fn$2 as firstFn,
	fn$3 as secondFn,
};

export {};
