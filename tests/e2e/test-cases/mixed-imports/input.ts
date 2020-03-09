import DefaultClass, { NonDefaultInterface } from 'package-with-default-export';
import { default as RenamedDefaultClass, NonDefaultInterface as RenamedInterface } from 'package-with-default-export';
import * as wholePackage from 'package-with-default-export';
import defaultImportedNamespace from 'package-with-default-export/namespace';
import defaultImportedNamespace2, * as starImportNameModule from 'package-with-default-export/namespace';
import * as unusedStarImport from 'package-with-default-export/namespace';

console.log(typeof unusedStarImport);

export interface ExportedInterface {
	field1: typeof DefaultClass;
	field2: NonDefaultInterface;
	field3: typeof RenamedDefaultClass;
	field4: RenamedInterface;
	field5: typeof wholePackage;
	field6: defaultImportedNamespace.Options;
	field7: defaultImportedNamespace2.Options;
	field8: typeof starImportNameModule;
}
