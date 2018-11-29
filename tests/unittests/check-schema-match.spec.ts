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
	testArray?: TestObj[];
	stringArray?: string[];
}

const testSchema: SchemeDescriptor<TestInterface> = {
	booleanProp: schemaPrimitiveValues.boolean,
	requiredBooleanProp: schemaPrimitiveValues.requiredBoolean,
	stringProp: schemaPrimitiveValues.string,
	requiredStringProp: schemaPrimitiveValues.requiredString,
	testArray: [{
		foo: schemaPrimitiveValues.requiredString,
	}],
	stringArray: [schemaPrimitiveValues.string],
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
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
	});

	it('should return true if object is matched partially', () => {
		const obj: TestInterface = {
			booleanProp: false,
			requiredBooleanProp: false,
			requiredStringProp: 'test',
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

	it('should return false if object contains exceeded property', () => {
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

	it('should return false if both does not have required property and have exceeded property', () => {
		const obj = {
			requiredBooleanProp: false,
			fooBar: 123,
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), false, formatErrors(errors));
	});

	it('should return true for if value is empty array', () => {
		const obj: TestInterface = {
			requiredBooleanProp: false,
			requiredStringProp: 'test',
			stringArray: [],
			testArray: [],
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
		};

		const errors: string[] = [];
		assert.strictEqual(checkSchemaMatch(obj, testSchema, errors), true, formatErrors(errors));
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
