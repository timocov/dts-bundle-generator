import { Date as LocalDate, Promise as LocalPromise } from './local-types';
import { InterfaceToAugment as Alias1, InterfaceToAugmentWithClass as Alias2 } from 'package-with-augmentable-declarations';

export interface Int {
	localD: LocalDate;
	globalD: Date;

	localP: LocalPromise;
	globalP: Promise<number>;
}

export interface Interface1 extends Alias1 {}
export interface Interface2 extends Alias2 {}

declare module 'package-with-augmentable-declarations' {
    interface InterfaceToAugment {
        newField: string;
    }

	class InterfaceToAugmentWithClass {
		newField: string;
	}

	interface Interface1 {}

	interface Interface3 extends Interface2 {}
}

declare global {
	interface Interface2 {}
	interface Interface3 extends Interface1 {}
}
