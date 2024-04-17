export type ThirdType = number;
export type SecondType<T, V> = T extends any ? V : FirstType<T>;
export type FirstType<T> = SecondType<ThirdType, T>;
export type MyType = FirstType<string>;

export {};
