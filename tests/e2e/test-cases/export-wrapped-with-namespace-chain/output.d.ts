import * as Ns from 'fake-package';
import * as Ns1 from 'package-with-export-eq';

type A = string;
type Str = string;

declare namespace SecondNamespaceName {
	export { A, Ns, Ns1 };
}
declare namespace FirstNamespaceName {
	export { SecondNamespaceName };
}
declare namespace TopNamespaceName {
	export { FirstNamespaceName };
}
declare namespace AnotherNsButRenamed {
	export { Str };
}

export {
	AnotherNsButRenamed,
	TopNamespaceName,
};

export {};
