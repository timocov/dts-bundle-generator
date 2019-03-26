import * as ts from 'typescript';
import * as path from 'path';

import { PathInfo } from '../module-info';
import { fixPath } from './fix-path';
import { warnLog } from '../logger';

export function getLibraryPaths(compilerOptions: ts.CompilerOptions): PathInfo[] | undefined {
	const baseUrl = compilerOptions.baseUrl;
	const paths = compilerOptions.paths;

	if (baseUrl === undefined || paths === undefined) {
		return undefined;
	}

	const libraryPaths: PathInfo[] = [];
	const ignoredPaths: string[] = [];

	for (const pathName in paths) {
		if (paths[pathName]) {
			if (isPathsLibraryName(pathName)) {
				libraryPaths.push(...paths[pathName].map((libraryPath: string) => ({
					libraryName: pathName,
					libraryPath: fixPath(path.normalize(path.join(baseUrl, libraryPath))),
				})));
			} else {
				ignoredPaths.push(pathName);
			}
		}
	}

	if (ignoredPaths.length > 0) {
		warnLog(`The following paths aren't supported yet and will not be used for detecting libraries: ${ignoredPaths.join(', ')}`);
	}

	return libraryPaths;
}

export function isPathsLibraryName(pathName: string): boolean {
	return /^[^\*\\\/]+$/.test(pathName);
}

export function getPathsLibraryName(fileName: string, paths: PathInfo[]): string | null {
	for (const { libraryName, libraryPath } of paths) {
		if (new RegExp(`^${libraryPath}\.((d\.)?ts|js)$`, 'i').test(fileName)) {
			return libraryName;
		}
	}

	return null;
}
