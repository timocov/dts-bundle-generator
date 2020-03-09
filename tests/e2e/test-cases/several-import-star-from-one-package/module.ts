import * as firstImportInModule from 'package-with-default-export';

export interface ExportedInterface {
	field1: typeof firstImportInModule;
}

export type ExportedType = string | number;
