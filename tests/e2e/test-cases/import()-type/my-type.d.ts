export interface MyType {
	field: import('./custom-type').CustomType;
	field2: typeof import('./custom-type').Namespace;
	field3: import('ora').Options;
	field4: import('./custom-type').GenericType<number, string>;
}
