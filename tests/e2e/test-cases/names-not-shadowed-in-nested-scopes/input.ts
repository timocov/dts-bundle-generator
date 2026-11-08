import { Instance as LocalInstance } from 'package-with-merged-export-eq';

// a type doesn't shadow a value
export namespace typeNextToValue {
	export type fn = number;
	export const usage: typeof import('./others').fn = null as any;
}

// a member of a namespace isn't a top-level name
export namespace notTopLevelQualifier {
	export type Deep = number;
	export type Usage = import('./others').inner.Deep;
}

// these are printed as they are written
export namespace keptImportType {
	export type Instance = number;
	export type Usage = import('package-with-merged-export-eq').Instance;
}

export namespace keptImportAlias {
	export type Instance = number;
	export type Usage = LocalInstance;
}
