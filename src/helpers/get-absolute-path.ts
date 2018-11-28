import * as path from 'path';
import * as process from 'process';

import { fixPath } from './fix-path';

export function getAbsolutePath(fileName: string, cwd?: string): string {
	if (!path.isAbsolute(fileName)) {
		fileName = path.join(cwd !== undefined ? cwd : process.cwd(), fileName);
	}

	return fixPath(fileName);
}
