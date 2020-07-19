import MyModule = require('package-with-export-eq');
import ClassName = require('./export-eq');

export class ExportedClass extends ClassName implements MyModule.SomeCoolInterface {
	public field: string = '';
	public field2: number = 0;
}
