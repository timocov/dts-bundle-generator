import { BAR as ARR_BAR, FOO as ARR_FOO } from './array-const';
import { BAR as OBJ_BAR, FOO as OBJ_FOO } from './obj-const';

export type BarType = typeof ARR_BAR | typeof OBJ_BAR;
export type FooType = typeof ARR_FOO | typeof OBJ_FOO;
