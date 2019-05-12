const variableName = {
	a: 123,
	b: 'string',
};

export type TypeOfConst = keyof typeof variableName;
