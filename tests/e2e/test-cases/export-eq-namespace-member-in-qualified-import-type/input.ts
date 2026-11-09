import { Map as AliasedMap } from 'package-with-export-eq-namespace';

export type Local = AliasedMap.Entry;
export type ImportType = import('package-with-export-eq-namespace').Map.Entry;
export type ImportTypeOf = typeof import('package-with-export-eq-namespace').Map.entryValue;
