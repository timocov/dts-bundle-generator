declare global {
	// adding some global types to check that collisions mechanism works
	type Promise$1 = string;
	type Promise$2 = string;

	type Date$1 = string;
}

export interface Promise {}
export interface Date {}
