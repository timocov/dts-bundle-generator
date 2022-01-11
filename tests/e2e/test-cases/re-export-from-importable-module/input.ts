export { Server } from 'http';
export * from 'fs';
export { SomeInterface } from './interface';
export { SomeInterface as Int1, AnotherInterface as Int2, default as DefInterface } from './interface';
export { constName as cName, letName as lName, funcName as fName, default as defFunction } from './variables';
export { default as MyClass } from './class';
export { default } from 'package-with-default-export';
