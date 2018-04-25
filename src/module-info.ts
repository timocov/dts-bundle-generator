import {
	getLibraryName,
	getTypesLibraryName,
	isTypescriptLibFile,
} from './node-modules-helpers';

export const enum ModuleType {
	ShouldNotBeUsed,
	ShouldBeInlined,
	ShouldBeImported,
	ShouldBeReferencedAsTypes,
}

export interface UsedModuleInfoCommon {
	fileName: string;
}

export interface InlinedModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeInlined;
}

export interface ImportedModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeImported;
	libraryName: string;
}

export interface ReferencedModuleInfo extends UsedModuleInfoCommon {
	type: ModuleType.ShouldBeReferencedAsTypes;
	typesLibraryName: string;
}

export interface NotUsedModuleInfo {
	type: ModuleType.ShouldNotBeUsed;
}

export type ModuleInfo = NotUsedModuleInfo | InlinedModuleInfo | ImportedModuleInfo | ReferencedModuleInfo;

export interface ModuleCriteria {
	inlinedLibraries: string[];
	importedLibraries: string[] | undefined;
	allowedTypesLibraries: string[] | undefined;
}

export function getModuleInfo(fileName: string, criteria: ModuleCriteria): ModuleInfo {
	const npmLibraryName = getLibraryName(fileName);
	if (npmLibraryName === null) {
		return { type: ModuleType.ShouldBeInlined, fileName: fileName };
	}

	if (isTypescriptLibFile(fileName)) {
		return { type: ModuleType.ShouldNotBeUsed };
	}

	const typesLibraryName = getTypesLibraryName(fileName);
	if (shouldLibraryBeInlined(npmLibraryName, typesLibraryName, criteria.inlinedLibraries)) {
		return { type: ModuleType.ShouldBeInlined, fileName: fileName };
	}

	if (shouldLibraryBeImported(npmLibraryName, typesLibraryName, criteria.importedLibraries)) {
		return { type: ModuleType.ShouldBeImported, fileName: fileName, libraryName: npmLibraryName };
	}

	if (typesLibraryName !== null && isLibraryAllowed(typesLibraryName, criteria.allowedTypesLibraries)) {
		return { type: ModuleType.ShouldBeReferencedAsTypes, fileName: fileName, typesLibraryName: typesLibraryName };
	}

	return { type: ModuleType.ShouldNotBeUsed };
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
