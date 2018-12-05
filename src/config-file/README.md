# Config file

Config file might be either JSON file or JS file with CommonJS export of the config.

## Schema

```js
{
    compilationOptions: {
        /**
         * EXPERIMENTAL!
         * Allows disable resolving of symlinks to the original path.
         * By default following is enabled.
         * @see https://github.com/timocov/dts-bundle-generator/issues/39
         * Optional. Default value is `true`.
         */
        followSymlinks: true,

        /**
         * Path to the tsconfig file that will be used for the compilation.
         * Must be set if entries count more than 1.
         */
        preferredConfigPath: './tsconfig.json',
    },

    // non-empty array of entries
    entries: [
        {
            /**
             * Path to input file (absolute or relative to config file).
             * Required.
             */
            filePath: './src/index.ts',

            /**
             * Path of generated d.ts.
             * If not specified - the path will be input file with replaced extension to `.d.ts`.
             */
            outFile: './out/index.d.ts',

            /**
             * Fail if generated dts contains class declaration.
             * Optional. Default value is `false`.
             */
            failOnClass: false,

            /**
             * Skip validation of generated d.ts file.
             * Optional. Default value is `false`.
             */
            noCheck: false,

            libraries: {
                /**
                 * Array of package names from @types to import typings from via the triple-slash reference directive.
                 * By default all packages are allowed and will be used according to their usages.
                 * Optional. Default value is `undefined`.
                 */
                allowedTypesLibraries: ['jquery', 'react'],

                /**
                 * Array of package names from node_modules to import typings from.
                 * Used types will be imported using `import { First, Second } from 'library-name';`.
                 * By default all libraries will be imported (except inlined libraries and libraries from @types).
                 * Optional. Default value is `undefined`.
                 */
                importedLibraries: ['rxjs', 'typescript'],

                /**
                 * Array of package names from node_modules to inline typings from.
                 * Used types will be inlined into the output file.
                 * Optional. Default value is `[]`.
                 */
                inlinedLibraries: ['@my-company/package'],
            },

            output: {
                /**
                 * Enables inlining of `declare global` statements contained in files which should be inlined (all local files and packages from inlined libraries).
                 * Optional. Default value is `false`.
                 */
                inlineDeclareGlobals: false,

                /**
                 * Sort output nodes in ascendant order.
                 * Optional. Default value is `false`.
                 */
                sortNodes: false,

                /**
                 * Name of the UMD module.
                 * If specified then `export as namespace ModuleName;` will be emitted.
                 * Optional. Default value is `undefined`.
                 */
                umdModuleName: 'MyModuleName',
            },
        },
    ],
}
```

## Tips

1. You can use `@ts-check` for your JS config-file to check that your config has correct schema.
1. Also you can write your config in TS and before run dts-bundle-generator compile it in JS.

## Examples

*JSON file*:

```json
{
    "compilationOptions": {
        "preferredConfigPath": "./tsconfig.json"
    },

    "entries": [
        {
            "filePath": "./src/index.ts",
            "outFile": "./out/index.d.ts",
            "libraries": {
                "inlinedLibraries": ["@my-company/package"]
            },
            "output": {
                "inlineDeclareGlobals": false,
                "sortNodes": true,
                "umdModuleName": "MyModuleName"
            }
        },
        {
            "filePath": "./src/second.ts",
            "outFile": "./out/second.d.ts",
            "failOnClass": true,
            "libraries": {
                "allowedTypesLibraries": [],
                "importedLibraries": [],
                "inlinedLibraries": []
            }
        },
        {
            "filePath": "./src/third.ts"
        }
    ]
}
```

*JS file*:

```js
// @ts-check

// If won't use `@ts-check` - just remove that comments (with `@type` JSDoc below).

/** @type import('dts-bundle-generator/config-schema').OutputOptions */
const commonOutputParams = {
    inlineDeclareGlobals: false,
    sortNodes: true,
};

/** @type import('dts-bundle-generator/config-schema').BundlerConfig */
const config = {
    compilationOptions: {
        preferredConfigPath: './tsconfig.json',
    },

    entries: [
        {
            filePath: './src/index.ts',
            outFile: './out/index.d.ts',
            noCheck: false,

            output: commonOutputParams,
        },

        {
            filePath: './src/second.ts',
            outFile: './out/second.d.ts',
            failOnClass: true,

            libraries: {
                inlinedLibraries: ['@my-company/package'],
            },

            output: commonOutputParams,
        },
    ],
};

module.exports = config;
```
