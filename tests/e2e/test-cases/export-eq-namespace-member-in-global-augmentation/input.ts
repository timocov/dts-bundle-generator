/// <reference types="package-with-global-export-eq-namespace" preserve="true" />

import { Date, Foo as AliasedFoo } from 'module-with-global-export-eq-namespace';

export type LocalDate = Date;
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
