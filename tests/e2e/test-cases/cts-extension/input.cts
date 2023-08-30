import { Interface } from './file.cjs';
import { Decl } from './decl.cjs';

export interface ExportedInterface extends Interface {
	foo: Decl;
}
