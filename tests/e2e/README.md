# e2e tests

## Create new test case

To create new test case you need to create new folder in [test-cases](./test-cases) (as a sample you may use [test-case-sample](./test-case-sample) folder).
New folder's name will be used as name of test case.

Each test case must have at least 3 files:

1. `input.ts` or `input.d.ts` - the entry point of test case (this file will used to generate typings).
1. `output.d.ts` - file with expected output - it will be used to compare with just generated (actual) typings.
1. `config.ts` - file with test case config (e.g. generator options). It must export test case config (see [test-case-config.ts](./test-cases/test-case-config.ts) for type) via `export =`.

## Run tests

```bash
# the command should be run in project root
npm run test
```
