import { MyType } from './my-type';
import { NonDefaultInterface as DFI } from 'package-with-default-export';

export type MySecondType = MyType | number | DFI;
