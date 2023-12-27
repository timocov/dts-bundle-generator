export interface MyType {
	field: import('./custom-type').CustomType;
	field2: typeof import('./custom-type').Namespace;
	field3: import('ora').Options;
	field4: import('./custom-type').GenericType<number, string>;
	field5: import('fake-package').Interface;
	field6: typeof import('./namespace').Namespace;
	field7: import('package-with-default-export').NonDefaultInterface;
}
