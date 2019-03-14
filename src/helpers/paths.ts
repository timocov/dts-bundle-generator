import * as ts from 'typescript';
import * as path from 'path';

import { PathInfo } from '../module-info';
import { fixPath } from './fix-path';

export function getEffectivePaths(compilerOptions: ts.CompilerOptions): PathInfo[] | undefined {
	const baseUrl = compilerOptions.baseUrl;
	const paths = compilerOptions.paths;

	if (baseUrl === undefined || paths === undefined) {
		return undefined;
	}

	const effectivePaths: PathInfo[] = [];

	for (const moduleName in paths) {
		if (paths[moduleName]) {
			paths[moduleName].forEach((modulePath: string) => effectivePaths.push({
				moduleName,
				modulePath: fixPath(path.normalize(path.join(baseUrl, modulePath))),
			}));
		}
	}

	return effectivePaths;
}

export function getPathsLibraryName(fileName: string, paths: PathInfo[]): string | null {
	for (const { moduleName, modulePath } of paths) {
		if (fileName.startsWith(modulePath)) {
			return moduleName;
		}
	}

	return null;
}
