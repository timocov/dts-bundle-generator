[![Build Status](https://travis-ci.org/timocov/dts-bundle-generator.svg?branch=master)](https://travis-ci.org/timocov/dts-bundle-generator)

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

1.
```
npm install --save-dev dts-bundle-generator
```
or
```
npm install -g dts-bundle-generator
```

2. Enable `declaration` compiler options in `tsconfig.json`


## Usage

```
usage: dts-bundle-generator [-h] [-o OUTFILE] [-v] [--no-check] [--output-source-file]
              [--fail-on-class] [--external-inlines EXTERNALINLINES]
              [--external-imports EXTERNALIMPORTS] [--config CONFIG]
              file

Positional arguments:
  file

Optional arguments:
  -h, --help            Show this help message and exit.
  -o OUTFILE, --out-file OUTFILE
                        File name of generated d.ts
  -v, --verbose         Enable verbose logging
  --no-check            Skip validation of generated d.ts file
  --output-source-file  Add comment with file path the definitions came from
  --fail-on-class       Fail if generated dts contains class declaration
  --external-inlines EXTERNALINLINES
                        Comma-separated packages from node_modules to inline
                        typings from it. Used types will be just inlined into
                        output file
  --external-imports EXTERNALIMPORTS
                        Comma-separated packages from node_modules to import
                        typings from it. Used types will be imported by
                        "import { First, Second } from 'library-name';"
  --config CONFIG       File path to generator config file
```

Example:
```
./node_modules/.bin/dts-bundle-generator -o my.d.ts path/to/your/entry-file.ts
./node_modules/.bin/dts-bundle-generator --external-inlines=@mycompany/internal-project --external-imports=@angular/core,rxjs path/to/your/entry-file.ts
```


## TODO

1. Add parameter to use custom `tsconfig` (currently it uses the closest `tsconfig.json`)
2. Add `/// <reference types="library">` for white-listed libraries (for example `jquery`) if some types from `library` is used ([#3](https://github.com/timocov/dts-bundle-generator/issues/3))
3. Add tests ([#2](https://github.com/timocov/dts-bundle-generator/issues/2))


## Why?

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
2. If you bundle your code in such a way all the modules are merged (like when using Webpack or Rollup) and there are no such modules as `a` or `b` (actually `entry` too).

## Known issues

1. Currently it does not work with `outDir` compiler option.


## Known limitations

1. Do not rename types when import. If you use something like this:
```ts
import { A as B } from './b';
export C extends B {}
```
you will get an error because this tool does not follow your renaming (and actually cannot).

2. Do not use types from `* as name`-imports:
```ts
import * as someName from './some';
export class A extends someName.SomeClass {}
```
This case is very similar to the previous one.

3. All your types should have different names inside a bundle. If you have 2 `interface Options {}` they will be merged by `TypeScript` and you will get wrong definitions.
