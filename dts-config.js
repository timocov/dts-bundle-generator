// @ts-check

/** @type import('./src/config-file/load-config-file').BundlerConfig */
const config = {
	compilationOptions: {
		preferredConfigPath: './tsconfig.json',
	},
	entries: [
		{
			filePath: './src/bundle-generator.ts',
			outFile: './dist/bundle-generator.d.ts',
		},
		{
			filePath: './src/config-file/load-config-file.ts',
			outFile: './dist/config-schema.d.ts',
		},
	],
};

module.exports = config;
