import * as fs from 'fs';
import * as path from 'path';

export function packageVersion(): string {
	let dirName = __dirname;
	while (dirName.length !== 0) {
		const packageJsonFilePath = path.join(dirName, 'package.json');
		if (fs.existsSync(packageJsonFilePath)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-var-requires
			return require(packageJsonFilePath).version as string;
		}

		dirName = path.join(dirName, '..');
	}

	throw new Error(`Cannot find up package.json in ${__dirname}`);
}
