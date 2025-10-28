import { Date as LocalDate, Promise as LocalPromise } from './local-types';
import { BaseEncodingOptions as Alias1, BigIntOptions as Alias2 } from 'node:fs';

export interface Int {
	localD: LocalDate;
	globalD: Date;

	localP: LocalPromise;
	globalP: Promise<number>;
}

export interface Interface1 extends Alias1 {}
export interface Interface2 extends Alias2 {}

declare module 'node:fs' {
    interface BaseEncodingOptions {
        newField: string;
    }

	class BigIntOptions {
		newField: string;
	}

	interface Interface1 {}

	interface Interface3 extends Interface2 {}
}

declare global {
	interface Interface2 {}
	interface Interface3 extends Interface1 {}
}
