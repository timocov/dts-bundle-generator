import { FooOptions } from './options';
import './other-global';

declare global {
	export namespace Cypress {
		export interface Chainable {
			foo(options?: FooOptions): void;
		}
	}
}
