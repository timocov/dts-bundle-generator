import * as assert from 'assert';

import { checkSchemaMatch, schemaPrimitiveValues, SchemeDescriptor } from '../../src/config-file/check-schema-match';

interface TestObj {
	foo: string;
}

interface TestInterface {
	booleanProp?: boolean;
	requiredBooleanProp: boolean;
	stringProp?: string;
	requiredStringProp: string;
	stringOrRegExpProp?: string | RegExp;
	testObj?: TestObj;
	testArray?: TestObj[];
	stringArray?: string[];
	stringOrRegExpArray?: (string | RegExp)[];
}

const testSchema: SchemeDescriptor<TestInterface> = {
	booleanProp: schemaPrimitiveValues.boolean,
	requiredBooleanProp: schemaPrimitiveValues.requiredBoolean,
	stringProp: schemaPrimitiveValues.string,
	requiredStringProp: schemaPrimitiveValues.requiredString,
	stringOrRegExpProp: schemaPrimitiveValues.stringOrRegExp,
	testObj: {
		foo: schemaPrimitiveValues.requiredString,
	},
	testArray: [{
		foo: schemaPrimitiveValues.requiredString,
	}],
	stringArray: [schemaPrimitiveValues.string],
	stringOrRegExpArray: [schemaPrimitiveValues.stringOrRegExp],
};

// Test the type definition
// @ts-expect-error -- expected to be unused
const testInvalidSchema: SchemeDescriptor<TestInterface> = {
	...testSchema,
	// @ts-expect-error -- must be one of the string values
	stringProp: schemaPrimitiveValues.stringOrRegExp,
	// @ts-expect-error -- must allow string AND regexp
	stringOrRegExpProp: schemaPrimitiveValues.string,
	// @ts-expect-error -- only one value type in array
	stringArray: [schemaPrimitiveValues.string, schemaPrimitiveValues.string],
	// @ts-expect-error -- must be an array of stringOrRegExp
	stringOrRegExpArray: [schemaPrimitiveValues.string],
};

function formatErrors(errors: string[]): string {
	return `errors: ${errors.join(' | ')}`;
}

describe('checkSchemaMatch', () => {
	it('should return true if object is fully matched', () => {
		const obj: TestInterface = {
			booleanProp: true,
			requiredBooleanProp: false,
			stringProp: 'test',
			requiredStringProp: 'test',
			stringOrRegExpProp: /test/,
			testObj: { foo: 'test' },
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
	});

	it('should return true if object is matched partially', () => {
		const obj: TestInterface = {
			booleanProp: false,
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringOrRegExpProp: 'test',
			testObj: undefined,
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
	});

	it('should return true if object contains only required values', () => {
		const obj: TestInterface = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
	});

	it('should return false if object contains excess property', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			fooBar: 123,
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if does not have required property', () => {
		const obj = {
			requiredBooleanProp: false,
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if nested object does not have required property', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			testObj: {},
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if both does not have required property and has excess property', () => {
		const obj = {
			requiredBooleanProp: false,
			fooBar: 123,
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return true if value is empty array', () => {
		const obj: TestInterface = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringArray: [],
			testArray: [],
			stringOrRegExpArray: [],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
	});

	it('should return true if array contains only valid values', () => {
		const obj: TestInterface = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringArray: ['string1', 'string2'],
			testArray: [
				{ foo: '3' },
				{ foo: '2' },
			],
			stringOrRegExpArray: ['string1', /string2/],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
	});

	it('should return false if array contains undefined', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringArray: ['', undefined],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if array contains null', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringArray: ['', null],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if array contains invalid primitive values', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringArray: ['', false, 123],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if stringOrRegExp array contains invalid primitive values', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringOrRegExpArray: ['', false, 123],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if array contains invalid objects', () => {
		const obj = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			testArray: [
				{ bar: '3' },
				{ foo: '2' },
				{ check: 123 },
			],
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return false if root object is undefined', () => {
		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(undefined, testSchema, errors), false, formatErrors(errors));
	});
});
