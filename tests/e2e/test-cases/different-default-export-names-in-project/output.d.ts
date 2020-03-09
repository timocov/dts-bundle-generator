import DefaultClassOriginal from 'package-with-default-export';

export interface ExportedInterface {
}
export interface ExportInterface {
	field1: typeof DefaultClassOriginal;
	field2: ExportedInterface;
}

export {};
