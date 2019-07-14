const config = {
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

if (process.env.TESTS_REPORT_FILE) {
	config.reporter = 'xunit';
	config['reporter-options'] = `output=${process.env.TESTS_REPORT_FILE}`;
}

module.exports = config;
