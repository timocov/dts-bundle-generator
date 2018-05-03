export function getRandom(): number {
	return 4;
}

export interface SomeInterface {
	field: typeof getRandom;
}
