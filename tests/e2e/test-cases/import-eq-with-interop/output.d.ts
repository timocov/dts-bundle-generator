import MyModule from 'package-with-export-eq';

declare class ClassName {
}
export declare class ExportedClass extends ClassName implements MyModule.SomeCoolInterface {
	field: string;
	field2: number;
}

export {};
