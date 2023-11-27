<!-- markdownlint-disable MD033 -->

<div align="center">
  <a href="https://github.com/timocov/dts-bundle-generator">
    <img width="250px" height="250px" src="https://github.com/timocov/dts-bundle-generator/raw/master/.github/logo.svg?sanitize=true">
  </a>
</div>

# DTS Bundle Generator

[![GH Actions][ci-img]][ci-link]
[![npm version][npm-version-img]][npm-link]
[![Downloads][npm-downloads-img]][npm-link]

Small tool to generate a dts bundle from your ts code.

For example:

```ts
// a.ts
export class A {}
```

```ts
// b.ts
export class B {}
```

```ts
// entry.ts
import { A } from './a';
import { B } from './b';

declare function makeA(): A;
export function makeB(): B {
    makeA();
    return new B();
}
```

When you run `dts-bundle-generator -o my.d.ts entry.ts` in `my.d.ts` you will get the following:

```ts
declare class B {
}
export declare function makeB(): B;
```

## Installation

1. Install the package from `npm`:

    ```bash
    npm install --save-dev dts-bundle-generator
    ```

    or

    ```bash
    npm install -g dts-bundle-generator
    ```

1. Enable `declaration` compiler option in `tsconfig.json`

## Usage

```
Usage: dts-bundle-generator [options] <file(s)>

Options:
  --help                         Show help                                                 [boolean]
  --out-file, -o                 File name of generated d.ts                                [string]
  --verbose                      Enable verbose logging                   [boolean] [default: false]
  --silent                       Disable any logging except errors        [boolean] [default: false]
  --no-check                     Skip validation of generated d.ts file   [boolean] [default: false]
  --fail-on-class                Fail if generated dts contains class declaration
                                                                          [boolean] [default: false]
  --external-inlines             Array of package names from node_modules to inline typings from.
                                 Used types will be inlined into the output file             [array]
  --external-imports             Array of package names from node_modules to import typings from.
                                 Used types will be imported using "import { First, Second } from
                                 'library-name';".
                                 By default all libraries will be imported (except inlined libraries
                                 and libraries from @types)                                  [array]
  --external-types               Array of package names from @types to import typings from via the
                                 triple-slash reference directive.
                                 By default all packages are allowed and will be used according to
                                 their usages                                                [array]
  --umd-module-name              Name of the UMD module. If specified then `export as namespace
                                 ModuleName;` will be emitted                               [string]
  --project                      Path to the tsconfig.json file that will be used for the
                                 compilation                                                [string]
  --sort                         Sort output nodes                        [boolean] [default: false]
  --inline-declare-global        Enables inlining of `declare global` statements contained in files
                                 which should be inlined (all local files and packages from
                                 `--external-inlines`)                    [boolean] [default: false]
  --inline-declare-externals     Enables inlining of `declare module` statements of the global
                                 modules (e.g. `declare module 'external-module' {}`, but NOT
                                 `declare module './internal-module' {}`) contained in files which
                                 should be inlined (all local files and packages from inlined
                                 libraries)                               [boolean] [default: false]
  --disable-symlinks-following   (EXPERIMENTAL) Disables resolving of symlinks to the original path.
                                 See https://github.com/timocov/dts-bundle-generator/issues/39 for
                                 more information                         [boolean] [default: false]
  --respect-preserve-const-enum  Enables stripping the `const` keyword from every direct-exported
                                 (or re-exported) from entry file `const enum`. See
                                 https://github.com/timocov/dts-bundle-generator/issues/110 for more
                                 information                              [boolean] [default: false]
  --export-referenced-types      By default all interfaces, types and const enums are marked as
                                 exported even if they aren't exported directly. This option allows
                                 you to disable this behavior so a node will be exported if it is
                                 exported from root source file only.      [boolean] [default: true]
  --config                       File path to the generator config file                     [string]
  --no-banner                    Allows remove "Generated by dts-bundle-generator" comment from the
                                 output                                   [boolean] [default: false]
  --version                      Show version number                                       [boolean]
```

Examples:

```bash
./node_modules/.bin/dts-bundle-generator -o my.d.ts path/to/your/entry-file.ts
```

```bash
./node_modules/.bin/dts-bundle-generator path/to/your/entry-file.ts path/to/your/entry-file-2.ts
```

```bash
./node_modules/.bin/dts-bundle-generator --external-inlines=@mycompany/internal-project --external-imports=@angular/core rxjs path/to/your/entry-file.ts
```

```bash
./node_modules/.bin/dts-bundle-generator --external-types=jquery path/to/your/entry-file.ts
```

## Config file

It is unnecessary, but you can use config file for the tool. See [config documentation](src/config-file/README.md) for more information.

## Why

If you have modules then you can create definitions by default using `tsc`, but `tsc` generates them for each module separately.
Yeah, you can use `outFile` (for `amd` and `system`), but generated code looks like this:

```ts
declare module "a" {
    export class A {
    }
}
declare module "b" {
    export class B {
    }
}
declare module "entry" {
    import { B } from "b";
    export function makeB(): B;
}
```

but:

1. `A` is not used at all and most probably you do not want to export it.
1. If you bundle your code in a way when all modules are merged (like when using Webpack or Rollup) then there should be no such modules as `a` or `b` (actually `entry` too) in the resulting file.

[ci-img]: https://github.com/timocov/dts-bundle-generator/workflows/CI%20Test/badge.svg?branch=master
[ci-link]: https://github.com/timocov/dts-bundle-generator/actions?query=branch%3Amaster

[npm-version-img]: https://badge.fury.io/js/dts-bundle-generator.svg
[npm-downloads-img]: https://img.shields.io/npm/dm/dts-bundle-generator.svg
[npm-link]: https://www.npmjs.com/package/dts-bundle-generator
