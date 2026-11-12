# e2e tests

Each test case is a folder in [test-cases](./test-cases) - the generator is run for its input file and the result is compared with the expected output.
The folder's name is used as the name of the test case.

## Create new test case

Create a new folder in [test-cases](./test-cases) (you may copy any existing test case as a starting point) with the following files:

1. `input.ts` (or `input.d.ts`, `input.mts`, `input.cts`) - the entry point of the test case, typings are generated for this file.
1. `output.d.ts` - the expected output. `$PACKAGE_CURRENT_VERSION` is replaced with the current package version before comparing.
1. `config.ts` - the test case config (e.g. generator options), see [test-case-config.ts](./test-cases/test-case-config.ts) for the type. It must be exported via `export default`:

    ```ts
    import type { TestCaseConfig } from '../test-case-config.ts';

    const config: TestCaseConfig = {};

    export default config;
    ```

    Note that the banner is disabled for all test cases unless `output.noBanner` is set explicitly.

1. `index.spec.js` - the file which runs the test case. Its content must be exactly the following (it is checked by [test-cases-validation.spec.ts](./test-cases-validation.spec.ts)):

    ```js
    (await import('../run-test-case.ts')).runTestCase(import.meta.dirname);
    ```

Optionally, a test case might have its own `tsconfig.json` which is used to compile it.
It should extend the [common one](./test-cases/tsconfig.json), e.g.:

```json
{
	"extends": "../tsconfig.json",
	"compilerOptions": {
		"types": ["some-types"]
	}
}
```

Packages used by test cases are located in [test-cases/node_modules](./test-cases/node_modules).

## Run tests

```bash
# the command should be run in project root
npm run test
```

Tests are run from the sources directly (via [Node.js type stripping](https://nodejs.org/api/typescript.html#type-stripping)) so there is no need to build the project first.
To type check the tests (including test cases' configs) run `npm run tsc`.
