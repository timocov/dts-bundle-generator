import MyModule from 'package-with-export-eq';
import ClassName from './export-eq';

export class ExportedClass extends ClassName implements MyModule.SomeCoolInterface {
	public field: string = '';
	public field2: number = 0;
}
