// @ts-check

/** @type import('./src/config-file/load-config-file').BundlerConfig */
const config = {
	compilationOptions: {
		preferredConfigPath: './tsconfig.options.json',
	},
	entries: [
		{
			filePath: './dts-out/bundle-generator.d.ts',
			outFile: './dist/bundle-generator.d.ts',
		},
		{
			filePath: './dts-out/config-file/load-config-file.d.ts',
			outFile: './config-schema.d.ts',
		},
	],
};

module.exports = config;
