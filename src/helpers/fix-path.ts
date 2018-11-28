export function fixPath(path: string): string {
	// special case for windows
	return path.replace(/\\/g, '/');
}
