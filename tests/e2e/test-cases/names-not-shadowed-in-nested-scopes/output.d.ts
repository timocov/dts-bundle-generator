import { Instance as LocalInstance } from 'package-with-merged-export-eq';

declare function fn(): void;
declare namespace inner {
	interface Deep {
		d: 1;
	}
}
export declare namespace typeNextToValue {
	type fn = number;
	const usage: typeof fn;
}
export declare namespace notTopLevelQualifier {
	type Deep = number;
	type Usage = inner.Deep;
}
export declare namespace keptImportType {
	type Instance = number;
	type Usage = import("package-with-merged-export-eq").Instance;
}
export declare namespace keptImportAlias {
	type Instance = number;
	type Usage = LocalInstance;
}

export {};
