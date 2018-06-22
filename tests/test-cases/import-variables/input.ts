import { declaredVariable, declaredVariable2, variable, variable2 } from 'package-with-typings';

export const myVar: typeof variable | typeof variable2 = 1;
export const myVar2: typeof declaredVariable | typeof declaredVariable2 = null;
