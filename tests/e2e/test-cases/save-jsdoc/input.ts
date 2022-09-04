import { NonExportedClass } from './some-class';

/**
 * ExportedInterface JSDoc
 */
export interface ExportedInterface {}

/**
 * ExportedType JSDoc
 */
export type ExportedType = string | number;

/**
 * ExportedConstEnum JSDoc
 */
export const enum ExportedConstEnum {
	/** Item description */
	Item,
}

/**
 * ExportedEnum JSDoc
 */
export enum ExportedEnum { Item }

/**
 * const JSDoc
 */
export const constItem = 1;

/**
 * ExportedClass JSDoc
 */
export class ExportedClass extends NonExportedClass {}
