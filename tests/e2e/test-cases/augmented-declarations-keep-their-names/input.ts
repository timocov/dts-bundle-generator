import {
	ClassToAugment as LocalClass,
	Date,
	EnumToAugment as LocalEnum,
	InterfaceToAugment as LocalInterface,
	NamespaceToAugment as LocalNamespace,
} from 'package-with-augmentable-declarations';

export interface Usage {
	localClass: LocalClass;
	date: Date;
	localEnum: LocalEnum;
	localInterface: LocalInterface;
	member: LocalNamespace.Member;
}

declare module 'package-with-augmentable-declarations' {
	interface ClassToAugment {
		added: string;
	}

	interface Date {
		added: string;
		parent: Date;
	}

	enum EnumToAugment {
		Added = 2,
	}

	interface InterfaceToAugment {
		added: string;
	}

	namespace NamespaceToAugment {
		interface Member {
			added: string;
		}
	}
}
