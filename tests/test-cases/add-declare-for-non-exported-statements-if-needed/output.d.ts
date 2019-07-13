declare var variableVar: string;
declare let variableLet: number;
declare const variableConst: boolean;
declare function func(): void;
export declare type VarType = typeof variableVar;
export declare type LetType = typeof variableLet;
export declare type ConstType = typeof variableConst;
export declare type FuncType = typeof func;
export declare type ExportedType = VarType | LetType | ConstType | FuncType;

export {};
