import { Interface } from 'fake-package';

export interface SubOptions {
}
export interface FooOptions {
	field: SubOptions;
}
declare global {
	export namespace Cypress {
		interface Chainable {
			bar(options?: Interface): void;
		}
	}
}
declare global {
	export namespace Cypress {
		interface Chainable {
			foo(options?: FooOptions): void;
		}
	}
}

export {};
