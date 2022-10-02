export interface MyType {
	field: string;
}

export function returnMyType(): MyType {
	return {
		field: "test"
	}
}
