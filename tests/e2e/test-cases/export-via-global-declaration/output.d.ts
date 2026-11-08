import { Interface } from 'fake-package';

interface SubOptions {
}
interface FooOptions {
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
