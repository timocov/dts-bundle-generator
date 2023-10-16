import { FooBar as EqFooBar } from 're-export-via-eq';
import EqFooBarV2 from 're-export-via-eq-v2';
import { FooBar as ImportFooBar } from 're-export-via-import';
import { FooBar as StartFooBar } from 're-export-via-star';
import { NsName } from 're-export-via-star-with-rename';

export interface Interface {
	eq: EqFooBar;
	eqV2: EqFooBarV2;
	import: ImportFooBar;
	star: StartFooBar;
	ns: typeof NsName;
}

export {};
