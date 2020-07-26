import * as firstImport from 'package-with-default-export';
import * as secondImport from 'package-with-default-export';
import * as thirdImportWholeModule from 'package-with-default-export';

export declare type ExportedType = string | number;
export interface ExportedInterface {
	field1: typeof firstImport.default;
	field2: typeof secondImport.default;
	field3: typeof thirdImportWholeModule;
	field4: ExportedType;
}

export {};
