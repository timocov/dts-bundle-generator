import * as fs from 'fs';
import * as path from 'path';

export function packageVersion(): string {
	let dirName = import.meta.dirname;
	while (dirName.length !== 0) {
		const packageJsonFilePath = path.join(dirName, 'package.json');
		if (fs.existsSync(packageJsonFilePath)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return JSON.parse(fs.readFileSync(packageJsonFilePath, { encoding: 'utf-8' })).version as string;
		}

		dirName = path.join(dirName, '..');
	}

	throw new Error(`Cannot find up package.json in ${import.meta.dirname}`);
}
