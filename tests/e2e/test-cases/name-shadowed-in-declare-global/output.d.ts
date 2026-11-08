declare function fn$1(): void;
declare global {
	namespace GlobalNamespace {
		const fn: number;
		const usage: typeof fn$1;
	}
}

export {
	fn$1 as fn,
};

export {};
