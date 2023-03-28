// see https://github.com/dexie/Dexie.js/blob/f6a6f29183c7a05f732397524c48ce4c1236bd6e/src/public/index.d.ts#L34-L47

import { ExportedType, Type1, Type2 } from './type';

interface _Type1 extends Type1 {}
interface _Type2 extends Type2 {}

declare module ExportedType {
  interface Type1 extends _Type1 {}
  interface Type2 extends _Type2 {}
}

export { ExportedType };
