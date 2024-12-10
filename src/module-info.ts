import * as path from 'path';

import * as ts from 'typescript';

import {
	getLibraryName,
	getTypesLibraryName,
} from './helpers/node-modules';

import { fixPath } from './helpers/fix-path';
import { NodeWithReferencedModule, resolveReferencedModule } from './helpers/typescript';

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
	inlinedLibraries?: string[];
	importedLibraries: string[] | undefined;
	allowedTypesLibraries: string[] | undefined;
	typeRoots?: string[];
}

export function getFileModuleInfo(fileName: string, criteria: ModuleCriteria): ModuleInfo {
	return getModuleInfoImpl(fileName, fileName, criteria);
}

export function getReferencedModuleInfo(moduleDecl: NodeWithReferencedModule, criteria: ModuleCriteria, typeChecker: ts.TypeChecker): ModuleInfo | null {
	const referencedModule = resolveReferencedModule(moduleDecl, typeChecker);
	if (referencedModule === null) {
		return null;
	}

	const moduleFilePath = ts.isSourceFile(referencedModule)
		? referencedModule.fileName
		: resolveModuleFileName(referencedModule.getSourceFile().fileName, referencedModule.name.text);

	return getFileModuleInfo(moduleFilePath, criteria);
}

export function getModuleLikeModuleInfo(moduleLike: ts.SourceFile | ts.ModuleDeclaration, criteria: ModuleCriteria, typeChecker: ts.TypeChecker): ModuleInfo {
	const resolvedModuleLike = ts.isSourceFile(moduleLike) ? moduleLike : resolveReferencedModule(moduleLike, typeChecker) ?? moduleLike;

	const fileName = ts.isSourceFile(resolvedModuleLike)
		? resolvedModuleLike.fileName
		: resolveModuleFileName(resolvedModuleLike.getSourceFile().fileName, resolvedModuleLike.name.text);

	return getFileModuleInfo(fileName, criteria);
}

function resolveModuleFileName(currentFileName: string, moduleName: string): string {
	return moduleName.startsWith('.') ? fixPath(path.join(currentFileName, '..', moduleName)) : `node_modules/${moduleName}/`;
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
				const relativePath = fixPath(path.relative(root, originalFileName));
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

	if (shouldLibraryBeImported(npmLibraryName, typesLibraryName, criteria.importedLibraries, criteria.allowedTypesLibraries)) {
		return { type: ModuleType.ShouldBeImported, fileName: originalFileName, isExternal: true };
	}

	if (typesLibraryName !== null && isLibraryAllowed(typesLibraryName, criteria.allowedTypesLibraries)) {
		return { type: ModuleType.ShouldBeReferencedAsTypes, fileName: originalFileName, typesLibraryName, isExternal: true };
	}

	return { type: ModuleType.ShouldBeUsedForModulesOnly, fileName: originalFileName, isExternal: true };
}

function shouldLibraryBeInlined(npmLibraryName: string, typesLibraryName: string | null, inlinedLibraries?: string[]): boolean {
	return isLibraryAllowed(npmLibraryName, inlinedLibraries) || typesLibraryName !== null && isLibraryAllowed(typesLibraryName, inlinedLibraries);
}

function shouldLibraryBeImported(
	npmLibraryName: string,
	typesLibraryName: string | null,
	importedLibraries: string[] | undefined,
	allowedTypesLibraries: string[] | undefined
): boolean {
	if (typesLibraryName === null) {
		return isLibraryAllowed(npmLibraryName, importedLibraries);
	}

	// to be imported a library from types shouldn't be allowed to be references as types
	// thus by default we treat all libraries as "should be imported"
	// but if it is a @types library then it should be imported only if it is not marked as "should be referenced as types" explicitly
	if (allowedTypesLibraries === undefined || !isLibraryAllowed(typesLibraryName, allowedTypesLibraries)) {
		return isLibraryAllowed(typesLibraryName, importedLibraries);
	}

	return false;
}

function isLibraryAllowed(libraryName: string, allowedArray?: string[]): boolean {
	return allowedArray === undefined || allowedArray.indexOf(libraryName) !== -1;
}

function remapToTypesFromNodeModules(pathRelativeToTypesRoot: string): string {
	return `node_modules/@types/${pathRelativeToTypesRoot}`;
}
