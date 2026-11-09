type ThirdType = number;
type SecondType<T, V> = T extends any ? V : FirstType<T>;
type FirstType<T> = SecondType<ThirdType, T>;
export type MyType = FirstType<string>;

export {};
