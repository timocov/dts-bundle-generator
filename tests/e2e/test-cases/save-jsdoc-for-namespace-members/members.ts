/**
 * NotMember JSDoc (must be removed as it is not reachable by its name)
 */
interface NotMember {}

/**
 * InterfaceMember JSDoc
 */
export interface InterfaceMember {
	field: NotMember;
}

/**
 * TypeMember JSDoc
 */
export type TypeMember = string;

/**
 * constMember JSDoc
 */
export const constMember: number = 1;

/**
 * firstVariable and secondVariable JSDoc
 */
export const firstVariable: number = 1, secondVariable: number = 2;

/**
 * functionMember JSDoc
 */
export function functionMember(): void {}

/**
 * ClassMember JSDoc
 */
export class ClassMember {}

/**
 * EnumMember JSDoc
 */
export enum EnumMember { Item }

/**
 * default member JSDoc
 */
export default function defaultMember(): void {}
