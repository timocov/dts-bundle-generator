import { Date as Date$1, Foo as AliasedFoo } from 'module-with-global-export-eq-namespace';

export type LocalDate = Date$1;
export type LocalFoo = AliasedFoo;
declare global {
	namespace GlobalNamespace {
		interface Date {
			extra: string;
		}
		interface Foo {
			extra: string;
		}
		interface Added {
			date: Date;
		}
	}
}

export {};
