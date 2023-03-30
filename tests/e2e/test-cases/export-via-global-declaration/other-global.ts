import { Interface } from 'fake-package';

declare global {
	export namespace Cypress {
		export interface Chainable {
			bar(options?: Interface): void;
		}
	}
}
