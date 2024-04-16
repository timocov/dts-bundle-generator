declare const [FOO = "321", BAR = 1337,];
declare const { FOO$1 = 123, BAR$1 = 42, };
export type BarType = typeof BAR | typeof BAR$1;
export type FooType = typeof FOO | typeof FOO$1;

export {};
