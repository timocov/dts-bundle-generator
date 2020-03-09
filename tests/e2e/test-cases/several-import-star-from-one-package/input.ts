import * as firstImport from 'package-with-default-export';
import * as secondImport from 'package-with-default-export';

import { ExportedType } from './module';

export interface ExportedInterface {
	field1: typeof firstImport.default;
	field2: typeof secondImport.default;
	field4: ExportedType;
}
