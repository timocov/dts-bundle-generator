export var variableVar: string = 'string';
export let variableLet: number = 123;
export const variableConst: boolean = false;
export function func(): void {}

export type VarType = typeof variableVar;
export type LetType = typeof variableLet;
export type ConstType = typeof variableConst;
export type FuncType = typeof func;
