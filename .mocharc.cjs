// test files are executed by Node.js directly (see https://nodejs.org/api/typescript.html#type-stripping)
const config = {
	extension: ['.spec.ts', '.spec.js'],
	checkLeaks: true,
	recursive: true,
	diff: true,
	timeout: 10000,
	slow: 5000,
};

module.exports = config;
