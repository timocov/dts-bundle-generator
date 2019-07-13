declare global {
	interface ArrayConstructor {
		field: string;
	}
}

export const field = Array.field;
