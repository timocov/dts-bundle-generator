import * as fs from 'fs';
import * as path from 'path';

export function packageVersion(): string {
	let dirName = __dirname;
	while (dirName.length !== 0) {
		const packageJsonFilePath = path.join(dirName, 'package.json');
		if (fs.existsSync(packageJsonFilePath)) {
			return require(packageJsonFilePath).version;
		}

		dirName = path.join(dirName, '..');
	}

	throw new Error(`Cannot find up package.json in ${__dirname}`);
}
