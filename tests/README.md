## Create new test case

To create new test case you need to create new folder in `tests/test-cases` (as sample you may use `tests/test-case-sample` folder).
New folder's name will be used as name of test case.

Each test case must have at least 3 files:

1. `index.ts` - the entry point of test case (this file will used to generate typings).
1. `output.d.ts` - file with expected output - it will be used to compare with just generated (actual) typings.
1. `config.ts` - file with test case config (e.g. generator options). It must export test case config (see `test-cases/test-case-config.ts` for type) via `export =`.

## Run tests

```bash
# all commands should be run in project root
npm run compile-tests
npm run test
```
