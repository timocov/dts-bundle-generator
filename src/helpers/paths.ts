import * as ts from 'typescript';
import * as path from 'path';

import { PathInfo } from '../module-info';
import { fixPath } from './fix-path';

export function getLibraryPaths(compilerOptions: ts.CompilerOptions): PathInfo[] | undefined {
	const baseUrl = compilerOptions.baseUrl;
	const paths = compilerOptions.paths;

	if (baseUrl === undefined || paths === undefined) {
		return undefined;
	}

	const libraryPaths: PathInfo[] = [];

	for (const pathName in paths) {
		if (paths[pathName] && isPathsLibraryName(pathName)) {
			libraryPaths.push(...paths[pathName].map((libraryPath: string) => ({
				libraryName: pathName,
				libraryPath: fixPath(path.normalize(path.join(baseUrl, libraryPath))),
			})));
		}
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
