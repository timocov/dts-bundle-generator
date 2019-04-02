export enum NonExportedEnum {
	First,
}

export const enum NonExportedConstEnum {
	First,
}

export class NonExportedClass {
	public method(): NonExportedEnum {
		return NonExportedEnum.First;
	}

	public method2(): NonExportedConstEnum {
		return NonExportedConstEnum.First;
	}
}
