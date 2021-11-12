const nodeModulesFolderName = 'node_modules/';
const libraryNameRegex = /node_modules\/((?:(?=@)[^/]+\/[^/]+|[^/]+))\//;

export function getLibraryName(fileName: string): string | null {
	const lastNodeModulesIndex = fileName.lastIndexOf(nodeModulesFolderName);
	if (lastNodeModulesIndex === -1) {
		return null;
	}

	const match = libraryNameRegex.exec(fileName.slice(lastNodeModulesIndex));
	if (match === null) {
		return null;
	}

	return match[1];
}

export function getTypesLibraryName(path: string): string | null {
	const libraryName = getLibraryName(path);
	if (libraryName === null) {
		return null;
	}

	const typesFolderPrefix = '@types/';
	if (!libraryName.startsWith(typesFolderPrefix)) {
		return null;
	}

	return libraryName.substring(typesFolderPrefix.length);
}
