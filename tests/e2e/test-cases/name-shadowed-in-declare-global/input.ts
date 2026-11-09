export { fn } from './others';

declare global {
	namespace GlobalNamespace {
		const fn: number;
		const usage: typeof import('./others').fn;
	}
}
