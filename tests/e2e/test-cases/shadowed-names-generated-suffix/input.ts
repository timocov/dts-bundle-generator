export { fn as firstFn } from './others';
export { fn as secondFn } from './other-fn';

export namespace namespaceWithSuffix {
	export const fn = 1;
	export const fn$1 = 2;
	export const usage: typeof import('./others').fn = null as any;
	export const otherUsage: typeof import('./other-fn').fn = null as any;
}
