module.exports = {
	require: [
		'ts-node/register',
	],
	extension: ['ts'],
	checkLeaks: true,
	recursive: true,
	diff: true,
	timeout: 10000,
	slow: 2500,
};
