declare const variableName: {
	a: number;
	b: string;
};
export type TypeOfConst = keyof typeof variableName;

export {};
