import * as path from 'path';

import {
	getLibraryName,
	getTypesLibraryName,
} from './helpers/node-modules';

export const enum ModuleType {
	ShouldBeInlined,
	ShouldBeImported,
	ShouldBeReferencedAsTypes,
	ShouldBeUsedForModulesOnly,
}

export interface UsedModuleInfoCommon {
	fileName: string;
	isExternal: boolean;
}

export interface InlinedModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeInlined;
}

export interface ImportedModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeImported;
	libraryName: string;
	isExternal: true;
}

export interface ReferencedModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeReferencedAsTypes;
	typesLibraryName: string;
	isExternal: true;
}

export interface UsedForModulesModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeUsedForModulesOnly;
	isExternal: true;
}

export type ModuleInfo = InlinedModuleInfo | ImportedModuleInfo | ReferencedModuleInfo | UsedForModulesModuleInfo;

export interface ModuleCriteria {
	inlinedLibraries: string[];
	importedLibraries: string[] | undefined;
	allowedTypesLibraries: string[] | undefined;
	typeRoots?: string[];
}

export function getModuleInfo(fileName: string, criteria: ModuleCriteria): ModuleInfo {
	return getModuleInfoImpl(fileName, fileName, criteria);
}

/**
 * @param currentFilePath Current file path - can be used to override actual path of module (e.g. with `typeRoots`)
 * @param originalFileName Original file name of the module
 * @param criteria Criteria of module info
 */
function getModuleInfoImpl(currentFilePath: string, originalFileName: string, criteria: ModuleCriteria): ModuleInfo {
	const npmLibraryName = getLibraryName(currentFilePath);
	if (npmLibraryName === null) {
		if (criteria.typeRoots !== undefined) {
			for (const root of criteria.typeRoots) {
				const relativePath = path.relative(root, originalFileName).replace(/\\/g, '/');
				if (!relativePath.startsWith('../')) {
					// relativePath is path relative to type root
					// so we should treat it as "library from node_modules/@types/"
					return getModuleInfoImpl(remapToTypesFromNodeModules(relativePath), originalFileName, criteria);
				}
			}
		}

		return { type: ModuleType.ShouldBeInlined, fileName: originalFileName, isExternal: false };
	}

	const typesLibraryName = getTypesLibraryName(currentFilePath);
	if (shouldLibraryBeInlined(npmLibraryName, typesLibraryName, criteria.inlinedLibraries)) {
		return { type: ModuleType.ShouldBeInlined, fileName: originalFileName, isExternal: true };
	}

	if (shouldLibraryBeImported(npmLibraryName, typesLibraryName, criteria.importedLibraries)) {
		return { type: ModuleType.ShouldBeImported, fileName: originalFileName, libraryName: typesLibraryName || npmLibraryName, isExternal: true };
	}

	if (typesLibraryName !== null && isLibraryAllowed(typesLibraryName, criteria.allowedTypesLibraries)) {
		return { type: ModuleType.ShouldBeReferencedAsTypes, fileName: originalFileName, typesLibraryName: typesLibraryName, isExternal: true };
	}

	return { type: ModuleType.ShouldBeUsedForModulesOnly, fileName: originalFileName, isExternal: true };
}

function shouldLibraryBeInlined(npmLibraryName: string, typesLibraryName: string | null, inlinedLibraries: string[]): boolean {
	return isLibraryAllowed(npmLibraryName, inlinedLibraries) || typesLibraryName !== null && isLibraryAllowed(typesLibraryName, inlinedLibraries);
}

function shouldLibraryBeImported(npmLibraryName: string, typesLibraryName: string | null, importedLibraries: string[] | undefined): boolean {
	// npm library can be imported only when it is not from @types
	const shouldNpmLibraryBeImported = typesLibraryName === null && isLibraryAllowed(npmLibraryName, importedLibraries);

	// library from @types can be imported only when it is specified explicitly
	const shouldTypesLibraryBeImported = importedLibraries !== undefined && typesLibraryName !== null && isLibraryAllowed(typesLibraryName, importedLibraries);

	return shouldNpmLibraryBeImported || shouldTypesLibraryBeImported;
}

function isLibraryAllowed(libraryName: string, allowedArray?: string[]): boolean {
	return allowedArray === undefined || allowedArray.indexOf(libraryName) !== -1;
}

function remapToTypesFromNodeModules(pathRelativeToTypesRoot: string): string {
	return `node_modules/@types/${pathRelativeToTypesRoot}`;
}
