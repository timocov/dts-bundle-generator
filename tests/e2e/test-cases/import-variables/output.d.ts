import { declaredVariable, declaredVariable2, variable, variable2 } from 'package-with-typings';

export declare const myVar: typeof variable | typeof variable2;
export declare const myVar2: typeof declaredVariable | typeof declaredVariable2;

export {};
