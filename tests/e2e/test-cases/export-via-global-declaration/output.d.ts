import { Interface } from 'fake-package';

export interface FooOptions {
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
