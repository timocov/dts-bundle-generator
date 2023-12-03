import * as firstImport from 'package-with-default-export';

export type ExportedType = string | number;
export interface ExportedInterface {
	field1: typeof firstImport.default;
	field2: typeof firstImport.default;
	field3: typeof firstImport;
	field4: ExportedType;
}

export {};
