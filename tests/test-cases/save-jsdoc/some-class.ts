/**
 * NonExportedEnum JSDoc must be removed from result dts
 */
export enum NonExportedEnum {
	First,
}

/**
 * NonExportedConstEnum JSDoc
 */
export const enum NonExportedConstEnum {
	First,
}

/**
 * NonExportedClass JSDoc must be removed from result dts
 */
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
