export interface PrimitiveValues {
	boolean: false;
	requiredBoolean: true;
	string: '';
	requiredString: 'REQUIRED';
	stringOrRegExp: 'StringOrRegExp';
}

export type SchemeDescriptorObject<T extends object> = {
	[P in keyof T]-?: SchemeDescriptor<NonNullable<T[P]>>;
};

export type SchemeDescriptor<T> =
	// Check for string-only first. [] prevents distributive conditional types from being applied to `string | RegExp`.
	[T] extends [string]
		? PrimitiveValues['string'] | PrimitiveValues['requiredString']
		: [T] extends [string | RegExp]
			? PrimitiveValues['stringOrRegExp']
			: T extends boolean
				? PrimitiveValues['boolean'] | PrimitiveValues['requiredBoolean']
				: T extends unknown[]
					? [SchemeDescriptor<T[number]>]
					: T extends object
						? SchemeDescriptorObject<T>
						// Value type is not currently supported
						: never;

export const schemaPrimitiveValues: Readonly<PrimitiveValues> = {
	boolean: false,
	requiredBoolean: true,
	string: '',
	requiredString: 'REQUIRED',
	stringOrRegExp: 'StringOrRegExp',
};

const schemaRequiredValues = new Set<unknown>([
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
function checkSchemaMatchRecursively<T>(value: unknown, schema: SchemeDescriptor<T>, prefix: string, errors: string[]): value is T {
	if (value === undefined && schemaRequiredValues.has(schema)) {
		errors.push(`Value for "${prefix}" is required and must have type "${typeof schema}"`);
		return false;
	}

	if (value === undefined || value === null) {
		return true;
	}

	if (schema === schemaPrimitiveValues.stringOrRegExp) {
		if (!(value instanceof RegExp) && typeof value !== 'string') {
			errors.push(`Value for "${prefix}" must be a string or RegExp`);
			return false;
		}
		return true;
	}

	if (typeof schema === 'boolean' || typeof schema === 'string') {
		const schemeType = typeof schema;
		const valueType = typeof value;
		if (schemeType !== valueType) {
			errors.push(`Incorrect value type for "${prefix}": expected=${schemeType}, actual=${valueType}`);
			return false;
		}

		return true;
	}

	if (Array.isArray(schema)) {
		if (!Array.isArray(value)) {
			errors.push(`Value for "${prefix}" must be an array`);
			return false;
		}

		let result = true;
		for (let i = 0; i < value.length; ++i) {
			if (value[i] === undefined || value[i] === null) {
				// undefined is not valid within arrays
				errors.push(`Value for "${prefix}[${i}]" is ${value[i]}`);
				result = false;
			} else if (!checkSchemaMatchRecursively(value[i], schema[0], `${prefix}[${i}]`, errors)) {
				result = false;
			}
		}

		return result;
	}

	if (typeof value !== 'object') {
		errors.push(`Value for "${prefix}" must be an object`);
		return false;
	}

	// At this point the schema and T are objects, but the compiler can't infer it
	const schemaObject = schema as SchemeDescriptorObject<Record<string, unknown>>;

	let result = true;
	for (const valueKey of Object.keys(value)) {
		if (schemaObject[valueKey] === undefined) {
			errors.push(`Excess property "${valueKey}" found in ${prefix.length === 0 ? 'the root' : prefix}`);
			result = false;
		}
	}

	for (const schemaKey of Object.keys(schemaObject)) {
		const isSubValueSchemeMatched = checkSchemaMatchRecursively(
			(value as Record<string, unknown>)[schemaKey],
			schemaObject[schemaKey],
			prefix.length === 0 ? schemaKey : `${prefix}.${schemaKey}`,
			errors
		);

		result = result && isSubValueSchemeMatched;
	}

	return result;
}
