import * as wholePackage from 'package-with-default-export';
import DefaultClass from 'package-with-default-export';
import { NonDefaultInterface, NonDefaultInterface as RenamedInterface, default as RenamedDefaultClass } from 'package-with-default-export';
import * as starImportNameModule from 'package-with-default-export/namespace';
import defaultImportedNamespace from 'package-with-default-export/namespace';
import defaultImportedNamespace2 from 'package-with-default-export/namespace';

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

export {};
