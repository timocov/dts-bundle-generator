[![npm version](https://badge.fury.io/js/dts-bundle-generator.svg)](https://badge.fury.io/js/dts-bundle-generator) [![Build Status](https://travis-ci.org/timocov/dts-bundle-generator.svg?branch=master)](https://travis-ci.org/timocov/dts-bundle-generator)

# DTS Bundle Generator

This small tool can generate a bundle of dts from your ts code.

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

When you run it as `dts-bundle-generator -o my.d.ts entry.ts` in `my.d.ts` you will get the following:

```ts
declare class B {
}
export declare function makeB(): B;
```

## Installation

1. Installing the package from `npm`:
    ```bash
    npm install --save-dev dts-bundle-generator
    ```

    or

    ```bash
    npm install -g dts-bundle-generator
    ```

1. Enable `declaration` compiler options in `tsconfig.json`

## Usage

```
Usage: dts-bundle-generator [options] <file>

Options:
  --help                Show help                                      [boolean]
  --out-file, -o        File name of generated d.ts                     [string]
  --verbose             Enable verbose logging        [boolean] [default: false]
  --no-check            Skip validation of generated d.ts file
                                                      [boolean] [default: false]
  --output-source-file  Add comment with file path the definitions came from
                                                      [boolean] [default: false]
  --fail-on-class       Fail if generated dts contains class declaration
                                                      [boolean] [default: false]
  --external-inlines    Comma-separated packages from node_modules to inline
                        typings from it. Used types will be just inlined into
                        output file                                     [string]
  --external-imports    Comma-separated packages from node_modules to import
                        typings from it.
                        Used types will be imported by "import { First, Second }
                        from 'library-name';".
                        By default all libraries will be imported (except
                        inlined)                                        [string]
  --external-types      Comma-separated packages from @types to import typings
                        from it via triple-slash reference directive.
                        By default all packages are allowed and will be used
                        according their usages                          [string]
  --umd-module-name     The name of UMD module. If specified `export as
                        namespace ModuleName;` will be emitted          [string]
  --config              File path to generator config file
  --version             Show version number                            [boolean]
```

Examples:

```bash
./node_modules/.bin/dts-bundle-generator -o my.d.ts path/to/your/entry-file.ts
```

```bash
./node_modules/.bin/dts-bundle-generator --external-inlines=@mycompany/internal-project --external-imports=@angular/core,rxjs path/to/your/entry-file.ts
```

```bash
./node_modules/.bin/dts-bundle-generator --external-types=jquery path/to/your/entry-file.ts
```

## TODO

1. Add parameter to use custom `tsconfig` (currently it uses the closest `tsconfig.json`)

1. Add tests ([#2](https://github.com/timocov/dts-bundle-generator/issues/2))

## Why

If you have modules you can create definitions by default via `tsc`, but it generates them for each module separately. Yeah, you can use `outFile` (for `amd` and `system`) but it generates code like this:

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

1. There is no one usages of `A` (maybe you do not want to export it?)

1. If you bundle your code in such a way all the modules are merged (like when using Webpack or Rollup) and there are no such modules as `a` or `b` (actually `entry` too).

## Known limitations

1. Do not rename types when import. If you use something like this:

    ```ts
    import { A as B } from './b';
    export C extends B {}
    ```

    you will get an error because this tool does not follow your renaming (and actually cannot).

1. Do not use types from `* as name`-imports:

    ```ts
    import * as someName from './some';
    export class A extends someName.SomeClass {}
    ```

    This case is very similar to the previous one.

    **NOTE:** some libraries with typings in `@types` (for example `react` or `react-dom`) has named exported namespace. As soon typings for this libraries will be imported via triple-slash directive you should import this libraries with renaming. For example for source

    ```ts
    import * as ReactDOM from 'react-dom';
    export interface MyRenderer extends ReactDOM.Renderer {}
    ```

    generated dts will be

    ```ts
    /// <reference types="react" />
    /// <reference types="react-dom" />

    export interface MyRenderer extends ReactDOM.Renderer {
    }
    ```

    So please **make sure** that your `* as name`-import has right `name`.

1. All your types should have different names inside a bundle. If you have 2 `interface Options {}` they will be merged by `TypeScript` and you will get wrong definitions.
