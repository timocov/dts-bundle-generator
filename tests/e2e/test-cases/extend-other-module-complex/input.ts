// we need to add this to add `extender.d.ts` to list of files to bundle the types after compilation for dts
/// <reference path="./extender.ts" preserve="true" />
/// <reference path="./internal-extender/extender.d.ts" preserve="true" />

import { SomeInterface } from './extendable-module';
import { justFunction } from './extender';

justFunction(true);

export default SomeInterface;
