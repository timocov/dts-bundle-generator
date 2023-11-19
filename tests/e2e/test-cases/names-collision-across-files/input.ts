export {
	default as TEMPLATE1,
	MergedSymbol as MS1,
	Interface as I1,
	TypeName as T1,
	func as f1,
	NamespaceName as NS1,

	// rename these to include them into import
	AnotherInterface as AI1,
	anotherFunc as af1,

} from './file1';

export {
	default as TEMPLATE2,
	MergedSymbol as MS2,
	Interface as I2,
	TypeName as T2,
	func as f2,
	NamespaceName as NS2,

	// yes, keep these without renaming so we can check that these aren't exported with wrong names
	AnotherInterface,
	anotherFunc,
} from './file2';

export { Inter } from './import-star-1';
export { Inter2 } from './import-star-2';
