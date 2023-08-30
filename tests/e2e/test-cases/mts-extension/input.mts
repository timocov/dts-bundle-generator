import { Interface } from './file.mjs';
import { Decl } from './decl.mjs';

export interface ExportedInterface extends Interface {
	foo: Decl;
}
