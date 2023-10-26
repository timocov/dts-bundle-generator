const path = require('path');

// override tsconfig for tests
process.env.TS_NODE_PROJECT = path.resolve(__dirname, './tsconfig.options.json');

// just transpile in tests
process.env.TS_NODE_TRANSPILE_ONLY = 'true';

const config = {
	require: [
		'ts-node/register',
	],
	extension: ['ts'],
	checkLeaks: true,
	recursive: true,
	diff: true,
	timeout: 10000,
	slow: 5000,
};

module.exports = config;
