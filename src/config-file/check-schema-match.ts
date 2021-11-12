// tslint:disable:strict-type-predicates

export interface PrimitiveValues {
	boolean: false;
	requiredBoolean: true;
	string: '';
	requiredString: 'REQUIRED';
}

export type SchemeDescriptor<T> = {
	[P in keyof T]-?: T[P] extends unknown[] ? [SchemeDescriptor<T[P][number]>] : SchemeDescriptor<T[P]>;
};

export const schemaPrimitiveValues: Readonly<PrimitiveValues> = {
	boolean: false,
	requiredBoolean: true,
	string: '',
	requiredString: 'REQUIRED',
};

const schemaRequiredValues = new Set([
	schemaPrimitiveValues.requiredBoolean,
	schemaPrimitiveValues.requiredString,
]);

export function checkSchemaMatch<T>(value: unknown, schema: SchemeDescriptor<T>, errors: string[]): value is T {
	if (value === undefined) {
		errors.push('Root value is undefined');
		return false;
	}

	return checkSchemaMatchRecursively(value, schema, '', errors);
}

// eslint-disable-next-line complexity
function checkSchemaMatchRecursively<T>(value: unknown, schema: SchemeDescriptor<T> | [SchemeDescriptor<T>], prefix: string, errors: string[]): value is T {
	if (typeof schema === 'boolean' || typeof schema === 'string') {
		const schemeType = typeof schema;
		if (value === undefined && schemaRequiredValues.has(schema)) {
			errors.push(`Value for "${prefix}" is required and must have type "${schemeType}"`);
			return false;
		}

		const valueType = typeof value;
		if (value !== undefined && typeof schema !== valueType) {
			errors.push(`Type of values for "${prefix}" is not the same, expected=${schemeType}, actual=${valueType}`);
			return false;
		}

		return true;
	}

	if (value === undefined) {
		return true;
	}

	if (Array.isArray(schema)) {
		if (!Array.isArray(value)) {
			return false;
		}

		let result = true;
		for (let i = 0; i < value.length; ++i) {
			if (!checkSchemaMatchRecursively(value[i], schema[0], `${prefix}[${i}]`, errors)) {
				result = false;
			}
		}

		return result;
	}

	type SchemeKey = keyof SchemeDescriptor<T>;
	type SchemeSubValue = SchemeDescriptor<T[keyof T]>;

	let result = true;
	for (const valueKey of Object.keys(value as object)) {
		if (schema[valueKey as keyof T] === undefined) {
			errors.push(`Exceeded property "${valueKey}" found in ${prefix.length === 0 ? 'the root' : prefix}`);
			result = false;
		}
	}

	for (const schemaKey of Object.keys(schema)) {
		const isSubValueSchemeMatched = checkSchemaMatchRecursively(
			(value as Record<string, unknown>)[schemaKey],
			schema[schemaKey as SchemeKey] as SchemeSubValue,
			prefix.length === 0 ? schemaKey : `${prefix}.${schemaKey}`,
			errors
		);

		result = result && isSubValueSchemeMatched;
	}

	return result;
}
