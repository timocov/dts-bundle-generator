import { NonDirectlyExportedConstEnum } from './const-enum';

export const enum DirectlyExportedConstEnum {
	FirstItem = 'const enum',
	SecondItem = 1,
}

export const foo = NonDirectlyExportedConstEnum.FooBar;

export { DirectlyReExportedConstEnum } from './const-enum';
