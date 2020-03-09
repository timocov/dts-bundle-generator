import DefaultClassOriginal from 'package-with-default-export';
import { ExportedInterface } from './my-file';

export interface ExportInterface {
	field1: typeof DefaultClassOriginal;
	field2: ExportedInterface;
}
