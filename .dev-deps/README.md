# Developer's dependencies

This folder is needed to have some developer's dependencies here, which are used to compile/lint the code.

## Why

The tool is written in TypeScript, and it uses TypeScript to do stuff also.
So, we should have TypeScript in both dev and prod dependency list:

- in dev for the compiler (`tsc`) and TSLint (because TSLint should use the same version of TypeScript as we compile the code)
- in prod TypeScript only for its API (with declaration files)

The possible solutions of this issue might be:

1. If TypeScript's team will provide 2 separate packages `typescript` and `typescript-cli`.

    In this case we can use `typescript` as prod dependency and `typescript-cli` as dev one.

1. `npm` will allows to have the same dependency both in `devDependencies` and `dependencies` and will install it in separate folders.

    In this case we can just put 2 `typescript`'s in separate dependencies list and control which we need in each case.

But neither TypeScript or npm does not have a solution (and will not have).

That is why we have `.dev-deps` with developer's dependencies.

This mechanism allows us use the latest compiler to compile source code
(and use new features like mapped or conditional types in source code)
and check that source code is compatible with specific TypeScript version and its API.

For example, we can use 2.9.2 to compile (and use conditional types in the code),
and check that source code is compatible with API of 2.6.2.
