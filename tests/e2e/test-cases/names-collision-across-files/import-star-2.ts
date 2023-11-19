import * as fakePackageButDifferent from 'fake-package';
import { Interface as FPI2, Interface } from 'fake-package';

import * as file1 from './file1';
import * as file1ButDifferent from './file1';
import { AnotherInterface as AiFromFile1 } from './file1';
import * as file2 from './file2';

export interface Inter2 {
	field: file1.Interface;
	field2: file2.AnotherInterface;
	field3: file1ButDifferent.TypeName;
	field4: AiFromFile1;
	field5: fakePackageButDifferent.Interface;
	field6: FPI2;
	field7: Interface;
}
