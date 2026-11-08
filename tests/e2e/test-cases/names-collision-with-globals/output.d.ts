import { InterfaceToAugment as Alias1, InterfaceToAugmentWithClass as Alias2 } from 'package-with-augmentable-declarations';

declare global {
	type Promise$1 = string;
	type Promise$2 = string;
	type Date$1 = string;
	interface Interface1 {
	}
}
interface Promise$3 {
}
interface Date$2 {
}
export interface Int {
	localD: Date$2;
	globalD: Date;
	localP: Promise$3;
	globalP: Promise<number>;
}
interface Interface1$1 extends Alias1 {
}
interface Interface2$1 extends Alias2 {
}
declare module "package-with-augmentable-declarations" {
	interface InterfaceToAugment {
		newField: string;
	}
	class InterfaceToAugmentWithClass {
		newField: string;
	}
	interface Interface1 {
	}
	interface Interface3 extends Interface2$1 {
	}
}
declare global {
	interface Interface2 {
	}
	interface Interface3 extends Interface1$1 {
	}
}

export {
	Interface1$1 as Interface1,
	Interface2$1 as Interface2,
};

export {};
