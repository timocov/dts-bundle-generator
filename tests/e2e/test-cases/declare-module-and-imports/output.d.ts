import { Barfoo } from 'package-with-re-exports';

declare module "fake-package" {
	export type A = Barfoo;
}

export {};
