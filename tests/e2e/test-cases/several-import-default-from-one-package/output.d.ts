import DefaultClass from 'package-with-default-export';
import DefaultClassRenamed from 'package-with-default-export';
import DefaultClassRenamed2 from 'package-with-default-export';

export interface ExportedInterface {
	field1: typeof DefaultClass;
	field2: typeof DefaultClassRenamed;
	field3: typeof DefaultClassRenamed2;
}

export {};
