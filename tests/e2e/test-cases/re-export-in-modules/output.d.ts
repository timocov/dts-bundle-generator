import { Package2Interface } from 'package-with-cyclic-re-export-1';
import { Package1Interface } from 'package-with-cyclic-re-export-2';
import { BarFoo } from 're-export-cycle-dependency-1';
import { FooBar } from 're-export-cycle-dependency-2';
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
	cycle1: BarFoo;
	cycle2: FooBar;
	cycle3: Package2Interface;
	cycle4: Package1Interface;
}

export {};
