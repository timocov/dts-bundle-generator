module.exports = {
	root: true,
	plugins: [
		'@typescript-eslint',
		'eslint-plugin-import',
		'eslint-plugin-prefer-arrow',
		'eslint-plugin-unicorn',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'plugin:import/typescript',
	],
	env: {
		browser: false,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.options.json',
		sourceType: 'module',
	},
	rules: {
		// enforces return statements in callbacks of array's methods
		// http://eslint.org/docs/rules/array-callback-return
		'array-callback-return': 'error',

		'arrow-parens': ['error', 'as-needed'],

		// enforce a maximum cyclomatic complexity allowed in a program
		complexity: ['error', { max: 13 }],

		// specify curly brace conventions for all control statements
		curly: ['error', 'all'],

		// require the use of === and !==
		eqeqeq: ['error', 'smart'],

		// require `for-in` loops to include an `if` statement
		'guard-for-in': 'error',

		// enforce a maximum number of classes per file
		'max-classes-per-file': ['error', 5],

		// disallow the use of alert, confirm, and prompt
		'no-alert': 'warn',

		// disallow use of arguments.caller or arguments.callee
		'no-caller': 'error',

		// disallow Unnecessary Labels
		// http://eslint.org/docs/rules/no-extra-label
		'no-extra-label': 'error',

		// disallow use of eval()
		'no-eval': 'error',

		// disallow adding to native types
		'no-extend-native': 'error',

		// disallow unnecessary function binding
		'no-extra-bind': 'error',

		// disallow the use of leading or trailing decimal points in numeric literals
		'no-floating-decimal': 'error',

		// disallow use of eval()-like methods
		'no-implied-eval': 'error',

		// disallow usage of __iterator__ property
		'no-iterator': 'error',

		// disallow use of labels for anything other then loops and switches
		'no-labels': ['error', { allowLoop: false, allowSwitch: false }],

		// disallow unnecessary nested blocks
		'no-lone-blocks': 'error',

		// disallow use of multiple spaces
		'no-multi-spaces': 'error',

		// disallow use of multiline strings
		'no-multi-str': 'error',

		// disallow use of new operator when not part of the assignment or comparison
		'no-new': 'error',

		// disallow use of new operator for Function object
		'no-new-func': 'error',

		// disallows creating new instances of String, Number, and Boolean
		'no-new-wrappers': 'error',

		// disallow use of octal escape sequences in string literals, such as
		// var foo = 'Copyright \251';
		'no-octal-escape': 'error',

		// disallow usage of __proto__ property
		'no-proto': 'error',

		// disallow use of assignment in return statement
		'no-return-assign': 'error',

		// disallow unnecessary `return await`
		'no-return-await': 'error',

		// disallow use of `javascript:` urls.
		'no-script-url': 'error',

		// disallow comparisons where both sides are exactly the same
		'no-self-compare': 'error',

		// disallow use of comma operator
		'no-sequences': 'error',

		// restrict what can be thrown as an exception
		'no-throw-literal': 'error',

		// requires to declare all vars on top of their containing scope
		// 'vars-on-top': 2,
		// require immediate function invocation to be wrapped in parentheses
		// http://eslint.org/docs/rules/wrap-iife.html
		'wrap-iife': ['error', 'inside'],

		// errors

		// disallow assignment in conditional expressions
		'no-cond-assign': ['error', 'always'],

		// disallow use of console
		'no-console': 'error',

		// disallow unnecessary parentheses
		'no-extra-parens': ['error', 'functions'],

		// disallow template literal placeholder syntax in regular strings
		'no-template-curly-in-string': 'error',

		// Avoid code that looks like two expressions but is actually one
		'no-unexpected-multiline': 'off',

		// es6

		// require space before/after arrow function's arrow
		// https://github.com/eslint/eslint/blob/master/docs/rules/arrow-spacing.md
		'arrow-spacing': ['error', { before: true, after: true }],

		// require trailing commas in multiline object literals
		'comma-dangle': ['error', {
			arrays: 'always-multiline',
			objects: 'always-multiline',
			imports: 'always-multiline',
			exports: 'always-multiline',
			functions: 'never',
		}],

		// disallow duplicate module imports
		'no-duplicate-imports': 'error',

		// require let or const instead of var
		'no-var': 'error',

		// disallow unnecessary constructor
		// http://eslint.org/docs/rules/no-useless-constructor
		'no-useless-constructor': 'error',

		// require method and property shorthand syntax for object literals
		// https://github.com/eslint/eslint/blob/master/docs/rules/object-shorthand.md
		'object-shorthand': 'off',

		// suggest using arrow functions as callbacks
		'prefer-arrow-callback': 'error',

		// suggest using of const declaration for variables that are never modified after declared
		'prefer-const': 'error',

		// require rest parameters instead of `arguments`
		'prefer-rest-params': 'error',

		// require template literals instead of string concatenation
		'prefer-template': 'off', // TODO

		// enforce usage of spacing in template strings
		// http://eslint.org/docs/rules/template-curly-spacing
		'template-curly-spacing': 'error',

		// enforce spacing around the * in yield* expressions
		// http://eslint.org/docs/rules/yield-star-spacing
		'yield-star-spacing': ['error', 'after'],

		// strict

		strict: 'off',

		// vars

		// disallow initializing variables to `undefined`
		'no-undef-init': 'error',

		// style

		// enforce spacing inside array brackets
		'array-bracket-spacing': ['error', 'never'],

		// enforce spacing before and after comma
		'comma-spacing': ['error', { before: false, after: true }],

		// enforce one true comma style
		'comma-style': ['error', 'last'],

		// disallow padding inside computed properties
		'computed-property-spacing': ['error', 'never'],

		// enforce newline at the end of file, with no multiple empty lines
		'eol-last': 'error',

		// specify whether double or single quotes should be used in JSX attributes
		// http://eslint.org/docs/rules/jsx-quotes
		'jsx-quotes': ['error', 'prefer-double'],

		// enforces spacing between keys and values in object literal properties
		'key-spacing': ['error', { beforeColon: false, afterColon: true }],

		// require a space before & after certain keywords
		'keyword-spacing': ['error', {
			before: true,
			after: true,
			overrides: {
				return: { after: true },
				throw: { after: true },
				case: { after: true },
			},
		}],

		// enforce a maximum number of parameters in function definitions
		'max-params': ['error', { max: 6 }],

		// require a capital letter for constructors
		'new-cap': ['error', { newIsCap: true, capIsNew: false }],

		// enforce or disallow parentheses when invoking a constructor with no arguments
		'new-parens': ['error', 'always'],

		// disallow use of the Array constructor
		'no-array-constructor': 'error',

		// disallow mixed spaces and tabs for indentation
		'no-mixed-spaces-and-tabs': 'error',

		// disallow multiple empty lines and only one newline at the end
		'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],

		// disallow nested ternary expressions
		// 'no-nested-ternary': 2,
		// disallow use of the Object constructor
		'no-new-object': 'error',

		// disallow specified syntax
		'no-restricted-syntax': ['error', 'ForInStatement', `BinaryExpression[operator='in']`],

		// disallow space between function identifier and application
		'no-spaced-func': 'error',

		// disallow trailing whitespace at the end of lines
		'no-trailing-spaces': 'error',

		// disallow the use of Boolean literals in conditional expressions
		// also, prefer `a || b` over `a ? a : b`
		// http://eslint.org/docs/rules/no-unneeded-ternary
		'no-unneeded-ternary': ['error', { defaultAssignment: false }],

		// disallow whitespace before properties
		// http://eslint.org/docs/rules/no-whitespace-before-property
		'no-whitespace-before-property': 'error',

		// require padding inside curly braces
		'object-curly-spacing': ['error', 'always'],

		// allow just one var statement per function
		'one-var': ['error', 'never'],

		// require a newline around variable declaration
		// http://eslint.org/docs/rules/one-var-declaration-per-line
		'one-var-declaration-per-line': ['error', 'always'],

		// enforce padding within blocks
		'padded-blocks': ['error', 'never'],

		// disallow using Object.assign with an object literal as the first argument and prefer the use of object spread instead.
		'prefer-object-spread': 'error',

		// require quotes around object literal property names
		// http://eslint.org/docs/rules/quote-props.html
		'quote-props': ['error', 'as-needed', { keywords: false, unnecessary: true, numbers: false }],

		// enforce spacing before and after semicolons
		'semi-spacing': ['error', { before: false, after: true }],

		// require or disallow space before blocks
		'space-before-blocks': 'error',

		// require or disallow space before function opening parenthesis
		// https://github.com/eslint/eslint/blob/master/docs/rules/space-before-function-paren.md
		'space-before-function-paren': ['error', { anonymous: 'never', named: 'never' }],

		// require or disallow spaces inside parentheses
		'space-in-parens': ['error', 'never'],

		// require spaces around operators
		'space-infix-ops': 'error',

		// require or disallow a space immediately following the // or /* in a comment
		'spaced-comment': ['error', 'always', {
			exceptions: ['-', '+'],
			markers: ['=', '!', '/'], // space here to support sprockets directives
		}],

		'@typescript-eslint/array-type': [
			'error',
			{
				default: 'array',
			},
		],
		'@typescript-eslint/brace-style': ['error', '1tbs', { allowSingleLine: true }],
		'@typescript-eslint/consistent-type-assertions': [
			'error',
			{
				assertionStyle: 'as',
				objectLiteralTypeAssertions: 'never',
			},
		],
		'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
		'@typescript-eslint/dot-notation': 'error',
		'@typescript-eslint/explicit-member-accessibility': [
			'error',
			{
				accessibility: 'explicit',
				overrides: {
					accessors: 'explicit',
					constructors: 'explicit',
				},
			},
		],
		'@typescript-eslint/indent': ['error', 'tab'],
		'@typescript-eslint/member-delimiter-style': 'error',
		'@typescript-eslint/member-ordering': [
			'error',
			{
				default: [
					'signature',
					'public-static-field',
					'protected-static-field',
					'private-static-field',
					'public-instance-field',
					'protected-instance-field',
					'private-instance-field',
					'constructor',
					'public-instance-method',
					'public-static-method',
					'protected-instance-method',
					'protected-static-method',
					'private-instance-method',
					'private-static-method',
				],
			},
		],
		'@typescript-eslint/naming-convention': [
			'error',
			{ selector: 'default', format: ['camelCase'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
			{ selector: 'typeLike', format: ['PascalCase'] },
			{ selector: 'enumMember', format: ['PascalCase'] },
		],
		'@typescript-eslint/no-empty-interface': 'off',
		'@typescript-eslint/no-empty-function': 'off',
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-extraneous-class': 'error',
		'@typescript-eslint/no-inferrable-types': [
			'error',
			{
				ignoreParameters: true,
				ignoreProperties: true,
			},
		],
		'@typescript-eslint/no-invalid-void-type': 'error',
		'@typescript-eslint/no-loop-func': 'error',
		'@typescript-eslint/no-namespace': 'off',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/no-parameter-properties': 'error',
		'@typescript-eslint/no-require-imports': 'off',
		'@typescript-eslint/no-shadow': 'error',
		'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
		'@typescript-eslint/no-unnecessary-qualifier': 'error',
		'@typescript-eslint/no-unnecessary-type-arguments': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unused-expressions': 'error',
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/prefer-for-of': 'off',
		'@typescript-eslint/prefer-function-type': 'error',
		'@typescript-eslint/prefer-readonly': 'off', // TODO
		'@typescript-eslint/promise-function-async': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
		'@typescript-eslint/restrict-plus-operands': 'off',
		'@typescript-eslint/semi': [
			'error',
			'always',
		],
		'@typescript-eslint/strict-boolean-expressions': 'off',
		'@typescript-eslint/triple-slash-reference': [
			'off',
			{
				path: 'never',
				types: 'prefer-import',
				lib: 'never',
			},
		],
		'@typescript-eslint/type-annotation-spacing': 'error',
		'@typescript-eslint/typedef': [
			'error',
			{
				parameter: true,
				propertyDeclaration: true,
				memberVariableDeclaration: true,
			},
		],
		'@typescript-eslint/unbound-method': 'off',

		'import/no-default-export': 'error',

		'prefer-arrow/prefer-arrow-functions': [
			'error',
			{
				singleReturnOnly: true,
				allowStandaloneDeclarations: true,
			},
		],

		'unicorn/empty-brace-spaces': ['error'],
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		'unicorn/no-array-push-push': ['error'],
		'unicorn/prefer-date-now': ['error'],
	},
};
