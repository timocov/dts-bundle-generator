export enum NonExportedEnum {
	First,
}

export const enum NonExportedConstEnum {
	First,
}

export class NonExportedClass {
	// tslint:disable-next-line
	public method(): NonExportedEnum {
		return NonExportedEnum.First;
	}

	// tslint:disable-next-line
	public method2(): NonExportedConstEnum {
		return NonExportedConstEnum.First;
	}
}
